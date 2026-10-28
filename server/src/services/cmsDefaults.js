// Default CMS content. Source: the supplied REGEN COSMETICS reference PDFs (copy reproduced as supplied).
// Everything here is editable from Admin > Content. Items marked "draft" were written for this build from the
// reference copy because the PDFs showed headings only; they must be reviewed by the business before launch.

const A = '/assets';
const faqQuestions = [
  'What ingredients are used in Sunscreen that make it a perfect choice for skin hydration?',
  'Can I use Regen Cosmetics Sunscreen on dry skin?',
  'On what skin type Regen Cosmetics Sunscreen can be used?',
  'Do I need to apply Sunscreen on oily skin?',
  'Is Regen Cosmetics Sunscreen lightweight?',
  'What is the right time to use Regen Cosmetics Sunscreen?',
  'What is the role of ingredients used in Regen Cosmetics Sunscreen?',
  'What are the benefits I can expect from the Sunscreen?',
  'Do I need to cleanse my face before applying Sunscreen?',
];
// DRAFT answers grounded only in the claims printed on the reference artwork; review before launch.
const faqAnswers = [
  'Please refer to the ingredient list on the product page and pack. The REGEN 1% Hyaluronic Sunscreen Matte Gel is formulated with hyaluronic acid for a hydrated, matte finish.',
  'REGEN sunscreens are designed to be lightweight and non-greasy. If your skin is very dry or sensitive, patch test first and follow with your regular moisturiser.',
  'The packaging describes REGEN sunscreens as suitable for all skin types, and the Matte Gel is positioned for oily and acne-prone skin. Always patch test before first use.',
  'Yes. Sunscreen is recommended for every skin type, including oily skin. A lightweight, non-comedogenic formula such as the Matte Gel is a good fit.',
  'Yes. Both the Daily Protective Sunscreen Serum and the 1% Hyaluronic Sunscreen Matte Gel are described as lightweight, non-greasy and blending easily without a white cast.',
  'Apply in the morning as the last step of your skincare routine, before sun exposure, and reapply as directed on the pack.',
  'Each ingredient has a specific role, such as hydration or UVA/UVB protection. See the Description and Information sections on each product page for details.',
  'Broad spectrum UVA/UVB protection, a lightweight non-greasy feel and no white cast, as described on the product packaging. Results vary from person to person.',
  'Yes. Apply sunscreen on clean, dry skin for best results.',
];

export const CMS_DEFAULTS = {
  home: {
    sectionOrder: ['hero', 'products', 'concerns', 'ownSkin', 'watchAndBuy', 'simplified', 'combos', 'promo', 'why', 'testimonials', 'selfcare', 'whyChoose', 'faq'],
    sectionVisibility: {},
    hero: {
      image: `${A}/hero-banner.webp`, headline: 'Reset Your Skin.\nRedefine Your\nConfidence.', ctaText: 'SHOP NOW', ctaLink: '/shop',
      ticker: ['VISIBLE RESULTS', 'POWERFUL INGREDIENTS', 'DERMATOLOGIST-TESTED', 'GLOWING SKIN'],
    },
    products: { title: 'Our Products', tabs: ['All', 'Best Sellers', 'All'] },
    concerns: {
      title: 'Shop By Concern',
      men: [
        { label: 'Pimple & Acne', slug: 'acne' }, { label: 'Dark Spots', slug: 'dark-spots' }, { label: 'Oil Control', slug: 'oil-control' },
        { label: 'Sun Damage & Tan', slug: 'sun-damage' }, { label: 'Anti-Aging', slug: 'anti-aging' },
      ],
      women: [
        { label: 'Pimple & Acne', slug: 'acne' }, { label: 'Dark Spots', slug: 'dark-spots' }, { label: 'Oil Control', slug: 'oil-control' },
        { label: 'Sun Damage & Tan', slug: 'sun-damage' }, { label: 'Anti-Aging', slug: 'anti-aging' },
      ],
    },
    ownSkin: {
      title: 'Own your Skin.', image: `${A}/own-your-skin.webp`, ctaText: 'SHOP THE COLLECTION', ctaLink: '/shop',
      paragraphs: [
        'Discover a skincare routine that works for you with REGEN Cosmetics.',
        'Our everyday essentials are designed to cleanse, hydrate, and protect your skin without the complications.',
        'Embrace self-care, build better habits, and feel confident in your skin every day.',
      ],
    },
    watchAndBuy: { title: 'Watch and Buy', items: [] },
    simplified: {
      title: 'Skincare, Simplified.', mobileTitle: "Men's Skincare, Simplified.", image: `${A}/couple.webp`, ctaText: 'Shop Now', ctaLink: '/shop', popularTitle: 'Most Popular products',
      body: 'Discover effortless skincare designed for men. From cleansing to hydration and protection, REGEN Cosmetics makes it easy to build a daily routine for healthy-looking, refreshed, and confident skin.',
      statLeft: { value: '5.2k', text: 'REGEN Cosmetics makes it easy to build a daily routine for healthy-looking, refreshed, and confident skin.' },
      statRight: { value: '3k+', label: 'Organic Products for Men', text: 'Simple, effective skincare for men to cleanse, hydrate, and protect every day.' },
    },
    combos: { title: 'Best Buy Combos', subtitle: 'Non-Comedogenic' },
    promo: { image: `${A}/sun-protection-banner.webp`, alt: 'Sun Protection for Healthier, Brighter Skin', link: '/shop' },
    why: {
      title: 'Why Regen Cosmetics?',
      intro: 'At REGEN Cosmetics, we empower every man to achieve healthy, refreshed skin through simple, effective skincare solutions that nourish, protect, and build lasting confidence.',
      stats: [
        { value: '20+ Years', text: 'Years of Combined Formulation Expertise team' },
        { value: '87.2%', text: 'Customers rate us 4 stars and above' },
        { value: '500K+', text: 'Happy customers and growing' },
      ],
    },
    testimonialsHeading: { title: 'CUSTOMER SAY!', subtitle: 'Customers love our products and we always strive to please them all.' },
    selfcare: {
      title: 'Selfcare Simplified',
      badges: ['Dermatologically tested', 'Paraben free', 'SLS free', 'Not tested on animals', 'Mineral oil free'],
    },
    whyChoose: {
      title: 'Why choose Regen Cosmetics?', image: `${A}/why-choose.webp`,
      points: [
        { title: 'Made for Men', text: "Skincare essentials designed to fit men's everyday needs." },
        { title: 'Simple Routines', text: 'Easy-to-follow skincare for effortless daily care.' },
        { title: 'Effective Care', text: 'Products focused on cleansing, hydration, and protection.' },
        { title: 'Confidence in Every Step', text: 'Build better skincare habits and feel confident in your skin.' },
      ],
    },
    faqTitle: 'Frequently Asked Questions:',
  },
  faqs: { items: faqQuestions.map((q, i) => ({ q: `Q.${i + 1}. ${q}`, a: faqAnswers[i] })) },
  testimonials: {
    // Reproduced from the reference design. Replace with real customer testimonials (with consent) before launch.
    items: [
      { quote: 'Regen Cosmetics has become an essential part of my skincare routine.', name: 'Aarohi Mehta' },
      { quote: 'I love the lightweight texture and how easily the products fit into my daily routine.', name: 'Aryan Doha' },
      { quote: 'I appreciate the thoughtful skincare experience Regen Cosmetics offers.', name: 'Priya Kapoor' },
    ],
  },
  footer: {
    newsletterText: 'Get the latest skincare tips and product updates.',
    copyright: '© 2026 REGEN COSMETICS. All Rights Reserved.',
    shopLinks: [
      { label: 'Shop All', to: '/shop' }, { label: 'Bestsellers', to: '/shop?bestseller=true' }, { label: 'Face Wash', to: '/category/face-wash' },
      { label: 'Moisturizers', to: '/category/moisturizers' }, { label: 'Serums', to: '/category/serums' }, { label: 'Sunscreen', to: '/category/sunscreen' },
    ],
    aboutLinks: [
      { label: 'Our Story', to: '/about' }, { label: 'Why REGEN', to: '/about#why' }, { label: 'The Skin Edit', to: '/faq' }, { label: 'Contact Us', to: '/contact' },
    ],
    legalLinks: [
      { label: 'FAQs', to: '/faq' }, { label: 'Shipping & Delivery', to: '/shipping-returns' }, { label: 'Returns & Refunds', to: '/shipping-returns' },
      { label: 'Privacy Policy', to: '/privacy-policy' }, { label: 'Terms & Conditions', to: '/terms' }, { label: 'Refund Policy', to: '/shipping-returns#refund' },
    ],
  },
  social: { facebook: '', instagram: '', email: '' },
  contact: {
    heading: "We're Here to Help",
    intro: 'Fill out this form to receive a call from our team. No matter what your issue is, once you submit the form correctly. Our team will try contact you within 3 to 5 business days.',
    supportTitle: 'Support Customer', supportIntro: 'Have a question? Please contact us using the customer support channels below.',
    formTitle: 'Contact Us', formIntro: 'Please submit all general enquiries in the contact form below and we look forward to hearing from you soon.',
    phone: '', email: '', openingHours: '', companyName: 'REGEN COSMETICS PRIVATE LIMITED', address: '',
  },
  about: {
    title: 'About REGEN COSMETICS', welcome: 'Welcome to Regen Cosmetics', headline: 'Skincare Made Simple. Confidence Made Natural.',
    body: 'At REGEN Cosmetics, we believe every man deserves skincare that feels simple, effective, and effortless. Our mission is to make everyday skincare easier with essentials designed to cleanse, hydrate, and protect your skin.',
    image: `${A}/couple.webp`,
    stats: [
      { value: '10 k', text: 'Years of combined experience customer of our formulation Development team' },
      { value: '54.2 %', text: 'Customers rate us 4 stars and above' },
      { value: '250 k+', text: 'Happy customers and growing' },
      { value: '13 +', text: 'Countries for sourcing our ingredients' },
    ],
    whyTitle: 'Why Choose Us',
    mission: { title: 'Our Mission', image: `${A}/key-features.webp`, items: [
      'Simplify Skincare: Make men\'s skincare easy to understand and follow every day.',
      'Promote Healthy Skin: Support healthy-looking skin through everyday skincare essentials.',
      'Effective Solutions: Focus on cleansing, hydration, and protection for daily care.',
      "Encourage Self-Care: Make skincare a natural and enjoyable part of men's routines.",
      "Build Confidence: Help men feel confident and comfortable in their own skin.",
      'Create Consistency: Encourage simple routines that are easy to maintain.',
      "Prioritize Everyday Needs: Develop skincare solutions that fit modern men's lifestyles.",
    ] },
    vision: { title: 'Our Vision', image: `${A}/product-detail-banner.webp`, items: [
      "Redefine Men's Skincare: Transform how men approach their daily skincare routines.",
      "Make Skincare Accessible: Make skincare feel approachable for men of all experience levels.",
      'Inspire Better Habits: Encourage long-term commitment to everyday skin health.',
      'Champion Simplicity: Promote uncomplicated routines without unnecessary steps.',
      'Empower Every Man: Encourage confidence through consistent self-care.',
      'Promote Skin Awareness: Help men understand their skin types',
      "Build a Trusted Brand: Become a trusted name in simple, reliable men's skincare.",
    ] },
  },
  'legal.privacy': {
    title: 'Privacy policy',
    intro: 'This Privacy Policy describes how your personal information is collected, used, and shared when you visit or make a purchase from REGEN Cosmetics.',
    sections: [
      '1. Personal information we collect', '2. How do we use your personal information?', '3. Sharing you personal Information',
      '4. Do not track', '5. Data retention', '6. Changes', '7. Contact Us',
    ].map((heading) => ({ heading, paragraphs: ['The text for this section was not included in the supplied design. Add your approved privacy policy wording in Admin > Content > Privacy Policy.'] })),
  },
  'legal.shipping': {
    title: 'Shipping and Return', subtitle: 'Replacement, Refund & Cancellation Policy',
    intro: 'At REGEN Cosmetics, we believe every man deserves skincare that feels simple, effective, and effortless. Our mission is to make everyday skincare easier with essentials designed to cleanse, hydrate, and protect your skin.',
    introHeading: 'Shop Stress-Free with REGEN Cosmetics',
    sections: [
      { id: 'replacement', heading: '1. Free 7-Day Replacement Policy', paragraphs: ['Your order may qualify for a free replacement within 7 days of delivery under the following circumstances:'],
        subsections: [
          { heading: 'A) Wrong Product Received', paragraphs: ['If you receive a product different from the one you ordered, we apologize for the inconvenience. Please contact our customer support team with your order number and a photograph of the product received. Once verified, we will arrange a replacement at no additional cost.'] },
          { heading: 'B) Product Received in Damaged Condition', paragraphs: ['We take care to pack your products securely. However, if your order arrives damaged, please contact us with your order number and clear photographs of the damaged product and packaging. After verification, we will arrange an eligible replacement at no additional cost.'] },
          { heading: 'C) Incomplete Order Received', paragraphs: ['If any item is missing from your order, please contact our support team with your order number and details of the missing product. We will investigate the issue and arrange delivery of the missing item where applicable.'] },
        ] },
      { id: 'refund', heading: '2. Refund Policy for Prepaid Orders', paragraphs: ['Your order may qualify for a free replacement within 7 days of delivery under the following circumstances:'],
        subsections: [
          { heading: 'A) Order Cancellation', paragraphs: ["If you wish to cancel your order, please contact our customer support team as soon as possible. Cancellation requests are subject to the order's processing and shipping status. Eligible refunds for cancelled prepaid orders will be processed within 7 working days of cancellation approval."] },
          { heading: 'B) Return to Origin (RTO)', paragraphs: ['If a prepaid order is returned to us without successful delivery, please contact our support team. Eligible refunds will be processed to the original payment method, subject to verification and the applicable refund terms.'] },
        ] },
      { id: 'terms', heading: '3. Important Terms & Conditions', bullets: [
        'Replacement requests must be raised within 7 days of delivery.',
        'Please provide your order number and relevant photographs to help us verify your request.',
        'Products may be inspected before a replacement or refund is approved.',
        'Refund timelines may vary depending on your payment provider or bank.',
        'Personal preferences or a change of mind are not automatically eligible for replacement or refund unless stated in our applicable policy or required by law.',
      ] },
      { id: 'cod', heading: '4. Partial Cash on Delivery (COD)', subsections: [
        { heading: 'A) Advance Payment', paragraphs: ['If Partial COD is offered at checkout, a specified amount must be paid online in advance. The remaining balance is payable at the time of delivery.'] },
        { heading: 'B) Advance Payment Terms', paragraphs: ['The refundability of the advance payment in cases of cancellation, refusal, return, or non-acceptance will be communicated clearly at checkout and handled in accordance with applicable law and the terms shown when placing the order.'] },
        { heading: 'C) Customer Acknowledgement', paragraphs: ['By selecting Partial COD at checkout, you agree to the payment terms displayed before confirming your order.'] },
      ] },
    ],
  },
  'legal.terms': {
    title: 'Terms & Conditions',
    intro: 'Welcome to REGEN Cosmetics, your online destination for men\'s skincare essentials. These Terms & Conditions (“Terms”) govern your access to and use of our website. By accessing our Website, browsing products, or placing an order, you agree to comply with these Terms, our Privacy Policy, and other applicable policies published on our Website.',
    sections: [
      { heading: '1. Acceptance of Terms', paragraphs: ['By using the REGEN Cosmetics Website, you confirm that you have read, understood, and agreed to these Terms. REGEN Cosmetics reserves the right to update or modify these Terms when necessary. Any changes will be published on this page, and your continued use of the Website after the changes take effect constitutes acceptance of the revised Terms.'] },
      { heading: '2. Eligibility & Permitted Use', paragraphs: ['You must be legally eligible to enter into a binding agreement under applicable law to use this Website and place orders. You agree to use the Website only for lawful purposes and not to:'], bullets: ['Engage in fraudulent or unlawful activities.', 'Attempt unauthorized access to our Website, systems, or customer data.', 'Upload viruses, malware, or other harmful code.', "Interfere with the Website's operation or security.", 'Copy, misuse, or exploit our content, products, or services without authorization.'] },
      { heading: '3. Product Information & Availability', paragraphs: ['We make reasonable efforts to display accurate product descriptions, images, ingredients, prices, sizes, and availability. However, minor variations in product appearance, packaging, or presentation may occur.', 'Product information and availability may change from time to time. REGEN Cosmetics reserves the right to correct errors, update product details, discontinue products, or cancel affected orders where necessary, subject to applicable law and appropriate customer communication.'] },
      { heading: '4. Account Registration', paragraphs: ['Certain Website features may require you to create an account. You agree to provide accurate, complete, and up-to-date information when registering or placing an order.', 'You are responsible for maintaining the confidentiality of your account credentials and for activities conducted through your account. Please notify us promptly if you suspect unauthorized access or misuse of your account.'] },
      { heading: '5. Orders & Payments', paragraphs: ['All orders placed through our Website are subject to product availability, order verification, and acceptance by REGEN Cosmetics. By placing an order, you confirm that:'], bullets: ['The information provided is accurate and complete.', 'You are authorized to use the selected payment method.', 'You agree to pay the displayed product price, applicable taxes, shipping charges, and other disclosed fees.'], after: ['Payments may be processed through third-party payment providers using the payment methods available at checkout. Order confirmation does not necessarily guarantee dispatch if further verification is required.', 'Prices, promotions, and product availability may change, but confirmed orders will be handled in accordance with applicable law and the terms communicated at purchase.'] },
      { heading: '6. Replacement Policy', paragraphs: ['REGEN Cosmetics aims to provide a satisfactory shopping experience. Eligible replacement requests may be raised within 7 days of delivery under the following circumstances:', 'Incorrect Product Received — If you receive a product different from the one ordered, contact our customer support team with your order number and clear photographs of the product received. Once verified, an eligible replacement will be arranged at no additional cost.', 'Damaged Product Received — If your product arrives damaged, please share your order number and photographs showing the damage. After verification, we will arrange an eligible replacement at no additional cost.', 'Incomplete Order Received — If any item is missing from your order, notify our customer support team with your order details. We will investigate and arrange delivery of the missing item where applicable.', 'For further information, please refer to our Replacement, Refund & Cancellation Policy.'] },
      { heading: '7. Refund & Cancellation Policy', bullets: ["Order cancellation requests must be submitted to our customer support team as soon as possible. Cancellations are subject to the order's processing and shipment status.", 'Approved refunds for eligible prepaid orders will generally be processed within 7 working days of approval.', 'Refunds for eligible prepaid orders returned to origin will be processed according to our published refund policy.', 'The time taken for the refunded amount to appear in your account may depend on your bank or payment provider.', 'All refund and cancellation requests are subject to our published policy and applicable consumer-protection laws.'] },
      { heading: '8. Returns & Exchanges', paragraphs: ['Returns and exchanges are handled in accordance with our published Replacement, Refund & Cancellation Policy. Requests for damaged, defective, incorrect, or incomplete products should be raised within the applicable request period.', 'For hygiene and product-safety reasons, certain skincare products may not be eligible for return once opened or used, except where a return, replacement, or refund is required by applicable law.', 'Please review the relevant policy before submitting a request.'] },
      { heading: '9. Privacy & Data Protection', paragraphs: ['We respect your privacy and handle personal information in accordance with our Privacy Policy and applicable data-protection laws.', 'Information may be collected when you browse our Website, create an account, place an order, or contact customer support. Such information is used for purposes such as order processing, delivery, customer assistance, and Website improvement, as described in our Privacy Policy.', 'We take reasonable measures to protect personal information. However, no method of electronic transmission or storage can guarantee absolute security.'] },
      { heading: '10. Intellectual Property Rights', paragraphs: ['All content on the REGEN Cosmetics Website, including logos, brand names, text, photographs, graphics, illustrations, product descriptions, layouts, and other materials, is owned by REGEN Cosmetics or its respective licensors and is protected by applicable intellectual-property laws.', 'You may not reproduce, distribute, modify, publish, or commercially use Website content without prior written permission, except where permitted by law.'] },
      { heading: '11. Skincare Disclaimer', paragraphs: ['REGEN Cosmetics products are intended for cosmetic skincare purposes. Product descriptions are provided for general informational purposes and are not intended to diagnose, treat, cure, or prevent medical conditions.', 'Individual experiences and results may vary depending on skin type, ingredients, usage, and other factors. Please review product labels and ingredient lists before use.', 'Discontinue use if irritation occurs and seek professional advice where appropriate. If you have known allergies or specific skin concerns, consult a qualified healthcare professional before using a new product.'] },
      { heading: '12. Disclaimer of Warranties', paragraphs: ['We make reasonable efforts to keep our Website functional and product information accurate. However, the Website and its content are provided on an “as available” basis, subject to applicable law.', 'We do not guarantee uninterrupted Website access, error-free content, or identical results for every customer. Nothing in these Terms excludes any consumer rights or statutory warranties that cannot lawfully be excluded.'] },
      { heading: '13. Limitation of Liability', paragraphs: ['To the extent permitted by applicable law, REGEN Cosmetics shall not be liable for indirect or consequential losses arising from the use of the Website or products.', 'Nothing in these Terms limits or excludes liability where such limitation or exclusion is prohibited by law, including applicable consumer rights. Any other limitation of liability will apply only to the extent legally permitted.'] },
      { heading: '14. Indemnification', paragraphs: ['You agree to use the Website lawfully and responsibly. To the extent permitted by applicable law, you may be responsible for losses or claims arising directly from your unlawful use of the Website, fraud, or intentional violation of these Terms.', 'Nothing in this section limits any rights or remedies available under applicable law.'] },
      { heading: '15. Governing Law & Jurisdiction', paragraphs: ['These Terms are governed by the laws of India. Any disputes arising in connection with the Website or these Terms will be handled by the courts having jurisdiction under applicable Indian law.', "Nothing in this section limits any consumer's statutory right to seek remedies before an appropriate consumer dispute redressal authority or forum."] },
      { heading: '16. Suspension & Termination', paragraphs: ['REGEN Cosmetics may suspend or restrict access to Website features where reasonably necessary to address fraud, security risks, unlawful activity, or serious violations of these Terms.', 'Where appropriate, we may notify affected users and provide an opportunity to resolve the issue. Any suspension or termination will be subject to applicable law and will not remove rights or obligations that have already accrued.'] },
    ],
  },
  business: { legalName: 'REGEN COSMETICS PRIVATE LIMITED', address: '', gstin: '', phone: '', email: '', taxNote: 'Prices are inclusive of all applicable taxes.' },
  seo: { siteTitle: 'REGEN Cosmetics | Men\'s Skincare, Simplified', siteDescription: "Simple, effective skincare for men: sunscreens, hydration and everyday essentials from REGEN Cosmetics." },
};

export const PUBLIC_CMS_KEYS = ['home', 'faqs', 'testimonials', 'footer', 'social', 'contact', 'about', 'legal.privacy', 'legal.shipping', 'legal.terms', 'seo'];
export const ALL_CMS_KEYS = [...PUBLIC_CMS_KEYS, 'business'];
