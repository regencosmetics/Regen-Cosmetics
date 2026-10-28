import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import Seo from '@/components/common/Seo.jsx';
import { PageLoader } from '@/components/common/Feedback.jsx';
import { useCms } from '@/hooks';
import { publicApi } from '@/services';
import { errorMessage } from '@/services/api';
import { contactSchema, zodResolver } from '@/utils/schemas';

const box = 'w-full rounded-[4px] border border-neutral-500 bg-white px-[15px] font-sans text-[14px] text-black placeholder:text-neutral-500 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand md:text-[16px]';

export default function Contact() {
  const { data: c, loading } = useCms('contact');
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(contactSchema) });
  const send = async (v) => { try { await publicApi.contact({ ...v, website: '' }); toast.success('Thanks! Your message has been sent.'); reset(); } catch (e) { toast.error(errorMessage(e)); } };
  if (loading) return <PageLoader />;
  const E = ({ m }) => (m ? <p role="alert" className="mt-1 text-xs text-red-600">{m}</p> : null);
  return (
    <div className="wrap pb-12 pt-8 md:pb-[90px] md:pt-[58px]"><Seo title="Contact Us" description={c.intro?.slice(0, 160)} path="/contact" />
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <h1 className="font-sans text-[28px] font-semibold text-black md:text-[48px]">{c.heading}</h1>
        <p className="mx-auto mt-3 max-w-[840px] font-sans text-[14px] text-black md:mt-[16px] md:text-[18px] md:leading-[21px]">{c.intro}</p>
      </motion.div>
      <div className="mt-8 grid gap-8 md:mt-[52px] md:grid-cols-[360px_1fr] md:gap-[46px]">
        <section aria-labelledby="sup-h">
          <h2 id="sup-h" className="font-sans text-[22px] font-semibold text-black md:text-[28px]">{c.supportTitle}</h2>
          <p className="mt-2 font-sans text-[14px] leading-[17px] text-black md:text-[16px]">{c.supportIntro}</p>
          {(c.phone || c.email) && <dl className="mt-6 font-sans text-[14px] text-black md:mt-[30px] md:text-[16px]"><dt className="font-semibold">Customer Care:</dt><dd className="mt-1">{c.phone && <>Phone: {c.phone}<br /></>}{c.email && <>Email: {c.email}</>}</dd></dl>}
          {c.openingHours && <dl className="mt-6 font-sans text-[14px] text-black md:mt-[30px] md:text-[16px]"><dt className="font-semibold">Opening hours:</dt><dd className="mt-1">We are open: {c.openingHours}</dd></dl>}
          {c.companyName && <p className="mt-6 font-sans text-[14px] uppercase text-black md:mt-[30px] md:text-[16px]">{c.companyName}</p>}
          {c.address && <dl className="mt-6 font-sans text-[14px] text-black md:mt-[30px] md:text-[16px]"><dt className="font-semibold">Office Address:</dt><dd className="mt-1">{c.address}</dd></dl>}
        </section>
        <section aria-labelledby="form-h">
          <h2 id="form-h" className="font-sans text-[22px] font-semibold text-black md:text-[28px]">{c.formTitle}</h2>
          <p className="mt-2 font-sans text-[13px] text-black md:text-[16px]">{c.formIntro}</p>
          <form onSubmit={handleSubmit(send)} noValidate className="mt-4 md:mt-[18px]">
            <div className="grid gap-3 md:grid-cols-[406px_1fr] md:gap-[18px]">
              <div><label htmlFor="c-name" className="sr-only">Your Name</label><input id="c-name" placeholder="Your Name" autoComplete="name" className={`${box} h-[44px] md:h-[45px]`} {...register('name')} /><E m={errors.name?.message} /></div>
              <div><label htmlFor="c-email" className="sr-only">Your Email</label><input id="c-email" type="email" placeholder="Your Email" autoComplete="email" className={`${box} h-[44px] md:h-[45px]`} {...register('email')} /><E m={errors.email?.message} /></div>
            </div>
            <div className="mt-3 md:mt-[9px]"><label htmlFor="c-phone" className="sr-only">Your Phone</label><input id="c-phone" type="tel" placeholder="Your Phone" autoComplete="tel" className={`${box} h-[44px] md:h-[45px]`} {...register('phone')} /><E m={errors.phone?.message} /></div>
            <div className="mt-3 md:mt-[9px]"><label htmlFor="c-msg" className="sr-only">Enter your Message</label><textarea id="c-msg" rows={4} placeholder="Enter your Message" className={`${box} resize-none py-3 md:h-[90px]`} {...register('message')} /><E m={errors.message?.message} /></div>
            <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
            <button type="submit" disabled={isSubmitting} className="mt-6 h-[45px] w-full rounded-[4px] bg-brand font-sans text-[18px] font-semibold text-white transition hover:bg-brand-600 hover:shadow-lg active:scale-[.995] disabled:opacity-60 md:mt-[51px] md:text-[22px]">{isSubmitting ? 'Sending…' : 'Send'}</button>
          </form>
        </section>
      </div>
    </div>
  );
}
