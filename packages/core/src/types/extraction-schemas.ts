export const CTASchema = {
  type: 'object',
  properties: {
    ctaButtons: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          text: { type: 'string' },
          href: { type: 'string' },
          type: { type: 'string', enum: ['primary', 'secondary', 'link'] },
          location: { type: 'string' },
        },
        required: ['text', 'href'],
      },
    },
  },
};

export const ContactSchema = {
  type: 'object',
  properties: {
    phone: { type: 'string' },
    email: { type: 'string' },
    address: { type: 'string' },
    hours: { type: 'string' },
  },
};

export const TeamSchema = {
  type: 'object',
  properties: {
    teamMembers: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          role: { type: 'string' },
        },
        required: ['name'],
      },
    },
  },
};

export const TestimonialSchema = {
  type: 'object',
  properties: {
    testimonials: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          quote: { type: 'string' },
          attribution: { type: 'string' },
        },
        required: ['quote'],
      },
    },
  },
};

export const FAQSchema = {
  type: 'object',
  properties: {
    faqs: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          question: { type: 'string' },
          answer: { type: 'string' },
        },
        required: ['question', 'answer'],
      },
    },
  },
};

export const PricingSchema = {
  type: 'object',
  properties: {
    pricing: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          item: { type: 'string' },
          price: { type: 'string' },
          description: { type: 'string' },
        },
        required: ['item'],
      },
    },
  },
};

export const SocialLinksSchema = {
  type: 'object',
  properties: {
    socialLinks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          platform: { type: 'string' },
          url: { type: 'string' },
        },
        required: ['platform', 'url'],
      },
    },
  },
};
