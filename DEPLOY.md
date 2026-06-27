# 🚀 Deployment Guide — အစပြုသူအတွက်

ဒီ project က **TanStack Start + Supabase (Lovable Cloud)** ဖြင့်တည်ဆောက်ထားပါတယ်။ ဘယ်နေရာမှာမဆို အလွယ်တကူ deploy လုပ်နိုင်ပါတယ်။

---

## ✅ အလွယ်ဆုံးနည်းလမ်း — Lovable Platform မှာပဲဆက်သုံးခြင်း

Lovable ထဲက **Publish** ခလုတ်တစ်ချက်နှိပ်ရုံပါပဲ။ Database, Auth, Storage အားလုံးအလိုအလျောက်ပါသွားပါမယ်။

---

## 🌍 ပြင်ပ Hosting မှာ Deploy လုပ်ခြင်း (Vercel / Netlify / Cloudflare)

### အဆင့် ၁ — Code ကို GitHub သို့ပို့ပါ
Lovable editor ထဲမှာ **Plus (+) → GitHub → Connect project** နှိပ်ပါ။

### အဆင့် ၂ — Code ကို Clone လုပ်ပါ
```bash
git clone https://github.com/YOUR-USERNAME/YOUR-REPO.git
cd YOUR-REPO
bun install     # သို့မဟုတ် npm install
```

### အဆင့် ၃ — Supabase Project သစ်ဖန်တီးပါ
1. [supabase.com](https://supabase.com) မှာ free account ဖွင့်ပါ
2. New Project ဖန်တီးပါ
3. **Settings → API** ထဲက keys တွေကို ကူးယူပါ

### အဆင့် ၄ — Database Migrations ထည့်သွင်းပါ
```bash
# Supabase CLI install (တစ်ခါတည်းပဲ install လုပ်ရင်ရတယ်)
npm install -g supabase

# Link your project
supabase link --project-ref YOUR-PROJECT-REF

# Migrations အားလုံးကို push လုပ်ပါ
supabase db push
```

### အဆင့် ၅ — Environment Variables ထည့်ပါ
`.env.example` ကို `.env` အဖြစ်ကူးပြီး values တွေဖြည့်ပါ။

```bash
cp .env.example .env
# .env ဖိုင်ထဲမှာ Supabase keys တွေဖြည့်ပါ
```

### အဆင့် ၆ — Deploy လုပ်ပါ

#### Vercel (အကြံပြုဆုံး)
```bash
npm install -g vercel
vercel
```
Vercel dashboard ထဲမှာ Environment Variables တွေထည့်ဖို့မမေ့ပါနဲ့။

#### Netlify
```bash
npm install -g netlify-cli
netlify deploy --prod
```

#### Cloudflare Pages
```bash
bun run build
npx wrangler pages deploy .output/public
```

---

## 🧪 Local မှာ Run လုပ်ခြင်း
```bash
bun install
bun run dev
```
Browser မှာ `http://localhost:8080` ဖွင့်ပါ။

---

## 🔐 အရေးကြီးသော လုံခြုံရေး မှတ်ချက်များ

- `SUPABASE_SERVICE_ROLE_KEY` ကို **ဘယ်တော့မှ** browser/client code ထဲမှာမသုံးပါနဲ့
- `.env` file ကို git ထဲ commit မလုပ်ပါနဲ့ (`.gitignore` ထဲမှာပါပြီးသား)
- Production မှာ HTTPS သုံးပါ

---

## 🆘 အကူအညီလိုပါက
- [Lovable Docs](https://docs.lovable.dev)
- [Supabase Docs](https://supabase.com/docs)
- [TanStack Start Docs](https://tanstack.com/start)
