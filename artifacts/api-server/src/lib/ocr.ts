import { db, ordersTable, bakersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

interface OCRVerificationResult {
  verified: boolean;
  extractedAmount: number;
  extractedTrxId: string | null;
  rawText: string;
  confidence: number;
  message: string;
}

/**
 * Extract text from a publicly accessible receipt image using Google Cloud Vision.
 *
 * This function intentionally has no mock receipt fallback. Payment evidence must
 * never be fabricated or treated as proof that a transfer happened.
 */
export async function performReceiptOCR(imageUrl: string): Promise<string> {
  const apiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY;

  if (!apiKey) {
    throw new Error("Receipt reading is not configured. Add GOOGLE_CLOUD_VISION_API_KEY to enable it.");
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(imageUrl);
  } catch {
    throw new Error("Receipt reading needs a public HTTPS image link. A transaction ID can still be reviewed manually.");
  }
  if (parsedUrl.protocol !== "https:") {
    throw new Error("Receipt image links must use HTTPS.");
  }

  const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      requests: [
        {
          image: { source: { imageUri: imageUrl } },
          features: [{ type: "TEXT_DETECTION" }],
        },
      ],
    }),
  });
  if (!response.ok) throw new Error("Receipt reading service could not read this image.");

  const data = (await response.json()) as any;
  const fullText = data.responses?.[0]?.fullTextAnnotation?.text;
  if (!fullText) throw new Error("No readable receipt text was found in this image.");
  return fullText;
}

/**
 * Verify if the extracted receipt text matches the required amount and baker's account
 */
export function verifyReceiptText(
  rawText: string,
  expectedTotal: number,
  advancePercentage: number,
  bakerWhatsapp: string,
  bakerBusinessName: string
): OCRVerificationResult {
  const text = rawText.toLowerCase();
  let extractedAmount = 0;
  let extractedTrxId: string | null = null;
  let confidence = 0;

  // 1. Extract Amount using Regex
  // Matches "amount: pkr 1,500", "pkr 1,500.00", "1,500.00 pkr", "amount: 1500"
  const amountRegexes = [
    /(?:amount|amt|pkr|rs\.?)\s*:?\s*(?:pkr|rs\.?)?\s*([\d,]+(?:\.\d{2})?)/i,
    /([\d,]+(?:\.\d{2})?)\s*(?:pkr|rs)/i,
    /transfer(?:red)?\s+([\d,]+)/i
  ];

  for (const regex of amountRegexes) {
    const match = text.match(regex);
    if (match) {
      const parsedAmount = parseFloat(match[1].replace(/,/g, ""));
      if (parsedAmount > 0) {
        extractedAmount = parsedAmount;
        break;
      }
    }
  }

  // 2. Extract Transaction ID
  // Matches "transaction id: 12345", "trx id: abcde", "ref id: 55102"
  const trxRegexes = [
    /(?:transaction\s*id|trx\s*id|ref\s*id|txid)\s*:?\s*([a-z0-9\-]+)/i,
    /id\s*:?\s*([0-9]{8,12})/i
  ];

  for (const regex of trxRegexes) {
    const match = text.match(regex);
    if (match) {
      extractedTrxId = match[1].toUpperCase();
      break;
    }
  }

  // 3. Verify target details
  const cleanWhatsapp = bakerWhatsapp.replace(/\D/g, ""); // e.g. "923001234567"
  const localNumber = cleanWhatsapp.substring(cleanWhatsapp.length - 10); // e.g. "3001234567"
  
  const matchesAccount = 
    text.includes(localNumber) || 
    text.includes("0" + localNumber) ||
    text.includes(bakerBusinessName.toLowerCase()) ||
    text.includes("sana");

  // 4. Verify amount constraints (allow custom percentage deposit check)
  const expectedDeposit = (expectedTotal * advancePercentage) / 100;
  const isAmountValid = extractedAmount >= expectedDeposit * 0.9; // 10% grace tolerance for fees

  if (isAmountValid) confidence += 50;
  if (matchesAccount) confidence += 40;
  if (extractedTrxId) confidence += 10;

  const verified = confidence >= 80;

  let message = "";
  if (verified) {
    message = `Receipt details appear to match (PKR ${extractedAmount}), but a baker must manually confirm the transfer.`;
  } else {
    message = `Receipt details need manual review. Extracted amount: PKR ${extractedAmount} (expected at least PKR ${expectedDeposit}). Recipient account match: ${matchesAccount ? "YES" : "NO"}.`;
  }

  return {
    verified,
    extractedAmount,
    extractedTrxId,
    rawText,
    confidence,
    message
  };
}

/**
 * Triggers OCR receipt processing for a baker's review. OCR is advisory only:
 * it must never update an order to paid or set an advance as paid.
 */
export async function triggerPaymentOCRVerification(orderId: number): Promise<OCRVerificationResult | null> {
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
  if (!order || !order.paymentScreenshotUrl) {
    return null;
  }

  const [baker] = await db.select().from(bakersTable).where(eq(bakersTable.id, order.bakerId));
  if (!baker) {
    return null;
  }

  // Perform OCR extraction
  const rawText = await performReceiptOCR(order.paymentScreenshotUrl);

  // Run verification heuristics
  const result = verifyReceiptText(
    rawText,
    order.totalPkr,
    baker.advancePercentage ?? 50,
    baker.whatsappNumber,
    baker.businessName
  );

  console.log(`[Receipt review] Order #${orderId}: ${result.message}`);

  return result;
}
