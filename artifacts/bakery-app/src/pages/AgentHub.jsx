import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Save, Plus, Trash2, Sparkles, Check, BookOpen, MapPin, CreditCard, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { AgentApi } from '@/api/agentApi';

const defaultKnowledge = {
  bakerName: 'Zara Ahmed',
  businessName: 'Sweet Tooth',
  whatsappNumber: '',
  deliveryArea: '',
  deliveryFee: '',
  minimumOrder: '',
  paymentMethods: 'COD, JazzCash, Easypaisa',
  businessHours: 'Mon–Sat 10am–9pm',
  customPolicies: '',
  menu: [],
};

export default function AgentHub() {
  const [form, setForm] = useState(defaultKnowledge);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [section, setSection] = useState('menu'); // menu | delivery | payment | policies

  useEffect(() => {
    AgentApi.getKnowledge().then(k => {
      setForm({
        bakerName: k.bakerName || '',
        businessName: k.businessName || '',
        whatsappNumber: k.whatsappNumber || '',
        deliveryArea: k.deliveryArea || '',
        deliveryFee: k.deliveryFee || '',
        minimumOrder: k.minimumOrder || '',
        paymentMethods: k.paymentMethods || '',
        businessHours: k.businessHours || '',
        customPolicies: k.customPolicies || '',
        menu: Array.isArray(k.menu) ? k.menu : [],
      });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const update = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const addMenuItem = () => {
    setForm(p => ({ ...p, menu: [...p.menu, { name: '', price: '', description: '', eggless: false }] }));
  };

  const updateMenuItem = (i, field, value) => {
    const menu = [...form.menu];
    menu[i] = { ...menu[i], [field]: value };
    setForm(p => ({ ...p, menu }));
  };

  const removeMenuItem = (i) => {
    setForm(p => ({ ...p, menu: p.menu.filter((_, idx) => idx !== i) }));
  };

  const save = async () => {
    setSaving(true);
    try {
      await AgentApi.saveKnowledge(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const sections = [
    { id: 'menu', icon: BookOpen, label: 'Menu & Prices' },
    { id: 'delivery', icon: MapPin, label: 'Delivery' },
    { id: 'payment', icon: CreditCard, label: 'Payment & Hours' },
    { id: 'policies', icon: Sparkles, label: 'Custom Policies' },
  ];

  return (
    <div className="px-5 pt-6 pb-24 lg:px-8 lg:pt-8 lg:pb-8 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <Bot className="w-5 h-5 text-accent" />
        <span className="text-sm font-medium text-muted-foreground">AI Assistant</span>
      </div>
      <h1 className="font-heading text-3xl font-bold text-foreground mb-1">Agent Hub</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Teach your AI agent everything about your bakery. It answers customers using only this information.
      </p>

      {/* Baker identity */}
      <div className="bg-card rounded-2xl p-5 border border-border/50 shadow-soft mb-5">
        <h2 className="font-heading font-semibold text-foreground mb-4">Your Bakery</h2>
        <div className="space-y-3">
          <Field label="Baker Name" value={form.bakerName} onChange={v => update('bakerName', v)} placeholder="Zara Ahmed" />
          <Field label="Business Name" value={form.businessName} onChange={v => update('businessName', v)} placeholder="Sweet Tooth" />
          <Field label="WhatsApp Number" value={form.whatsappNumber} onChange={v => update('whatsappNumber', v)} placeholder="+92 300 1234567" />
        </div>
      </div>

      {/* Section tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-none">
        {sections.map(s => {
          const Icon = s.icon;
          return (
            <button key={s.id} onClick={() => setSection(s.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                section === s.id ? 'bg-primary text-primary-foreground' : 'bg-card border border-border/50 text-muted-foreground hover:text-foreground'
              }`}>
              <Icon className="w-3.5 h-3.5" />
              {s.label}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {/* MENU */}
        {section === 'menu' && (
          <motion.div key="menu" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <div className="bg-card rounded-2xl p-5 border border-border/50 shadow-soft">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-heading font-semibold text-foreground">Menu Items</h2>
                <button onClick={addMenuItem}
                  className="flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/10 px-3 py-1.5 rounded-full">
                  <Plus className="w-3.5 h-3.5" /> Add Item
                </button>
              </div>
              {form.menu.length === 0 ? (
                <div className="text-center py-8">
                  <BookOpen className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No menu items yet</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Add your cakes, cupcakes, and prices</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {form.menu.map((item, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      className="bg-muted/40 rounded-xl p-4 border border-border/30">
                      <div className="flex items-start gap-2 mb-3">
                        <div className="flex-1 grid grid-cols-2 gap-2">
                          <Field label="Item Name" value={item.name} onChange={v => updateMenuItem(i, 'name', v)} placeholder="Chocolate Truffle Cake" />
                          <Field label="Price (PKR)" value={item.price} onChange={v => updateMenuItem(i, 'price', v)} placeholder="4500" />
                        </div>
                        <button onClick={() => removeMenuItem(i)} className="w-8 h-8 flex items-center justify-center rounded-full bg-danger/10 text-danger mt-5 flex-shrink-0">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <Field label="Description (optional)" value={item.description || ''} onChange={v => updateMenuItem(i, 'description', v)} placeholder="Sizes available: 1kg, 1.5kg, 2kg" />
                      <label className="flex items-center gap-2 mt-3 cursor-pointer">
                        <div onClick={() => updateMenuItem(i, 'eggless', !item.eggless)}
                          className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${item.eggless ? 'bg-primary border-primary' : 'border-border'}`}>
                          {item.eggless && <Check className="w-2.5 h-2.5 text-white" />}
                        </div>
                        <span className="text-xs text-muted-foreground">Eggless option available</span>
                      </label>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* DELIVERY */}
        {section === 'delivery' && (
          <motion.div key="delivery" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <div className="bg-card rounded-2xl p-5 border border-border/50 shadow-soft space-y-3">
              <h2 className="font-heading font-semibold text-foreground mb-1">Delivery Info</h2>
              <Field label="Delivery Area" value={form.deliveryArea} onChange={v => update('deliveryArea', v)} placeholder="DHA, Gulberg, Defence (Lahore)" />
              <Field label="Delivery Fee" value={form.deliveryFee} onChange={v => update('deliveryFee', v)} placeholder="PKR 200" />
              <Field label="Minimum Order" value={form.minimumOrder} onChange={v => update('minimumOrder', v)} placeholder="PKR 2000" />
            </div>
          </motion.div>
        )}

        {/* PAYMENT & HOURS */}
        {section === 'payment' && (
          <motion.div key="payment" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <div className="bg-card rounded-2xl p-5 border border-border/50 shadow-soft space-y-3">
              <h2 className="font-heading font-semibold text-foreground mb-1">Payment & Hours</h2>
              <Field label="Payment Methods" value={form.paymentMethods} onChange={v => update('paymentMethods', v)} placeholder="COD, JazzCash, Easypaisa" />
              <Field label="Business Hours" value={form.businessHours} onChange={v => update('businessHours', v)} placeholder="Mon–Sat 10am–9pm" />
            </div>
          </motion.div>
        )}

        {/* POLICIES */}
        {section === 'policies' && (
          <motion.div key="policies" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <div className="bg-card rounded-2xl p-5 border border-border/50 shadow-soft">
              <h2 className="font-heading font-semibold text-foreground mb-3">Custom Policies</h2>
              <p className="text-xs text-muted-foreground mb-3">Add anything the agent should know: advance payment policy, cancellation, lead times, etc.</p>
              <textarea value={form.customPolicies} onChange={e => update('customPolicies', e.target.value)}
                placeholder="e.g. Minimum 2 days advance notice required. 50% advance payment for orders above PKR 5000. No cancellations after baking starts."
                rows={6}
                className="w-full bg-input rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Save button */}
      <motion.button whileTap={{ scale: 0.97 }} onClick={save} disabled={saving}
        className={`w-full mt-5 rounded-2xl py-4 font-medium text-base flex items-center justify-center gap-2 transition-all shadow-lift ${
          saved ? 'bg-success text-success-foreground' : 'bg-primary text-primary-foreground'
        } disabled:opacity-60`}>
        {saved ? <><Check className="w-5 h-5" /> Saved!</> : saving ? 'Saving…' : <><Save className="w-5 h-5" /> Save Knowledge</>}
      </motion.button>

      <div className="mt-4 bg-accent/5 border border-accent/20 rounded-2xl p-4">
        <p className="text-xs font-medium text-accent-foreground/70 mb-1.5">HOW THE AGENT USES THIS</p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Your AI agent reads this knowledge every time a customer asks a question. It will only answer based on what you've written here — it will never invent prices or items. Customers can also place orders through the chat.
        </p>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{label}</label>
      <input type={type} value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full bg-input rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30" />
    </div>
  );
}
