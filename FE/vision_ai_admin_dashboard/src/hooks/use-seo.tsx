import { useEffect } from 'react';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogType?: string;
  ogUrl?: string;
  twitterCard?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  robots?: string;
  lang?: string;
  author?: string;
  canonical?: string;
}

export function useSEO({
  title,
  description,
  keywords,
  ogTitle,
  ogDescription,
  ogType = 'website',
  ogUrl,
  twitterCard = 'summary_large_image',
  twitterTitle,
  twitterDescription,
  robots = 'noindex, nofollow', // Admin dashboard nên không được index
  lang = 'vi',
  author = 'Vision AI Team',
  canonical,
}: SEOProps) {
  useEffect(() => {
    // Update document title
    if (title) {
      document.title = title;
    }

    // Update document language
    if (lang && document.documentElement.lang !== lang) {
      document.documentElement.lang = lang;
    }

    // Helper function to update or create meta tag
    const updateMetaTag = (name: string, content: string, property = false) => {
      const attribute = property ? 'property' : 'name';
      let element = document.querySelector(`meta[${attribute}="${name}"]`) as HTMLMetaElement;

      if (element) {
        element.content = content;
      } else {
        element = document.createElement('meta');
        element.setAttribute(attribute, name);
        element.content = content;
        document.head.appendChild(element);
      }
    };

    // Helper function to update or create link tag
    const updateLinkTag = (rel: string, href: string) => {
      let element = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement;

      if (element) {
        element.href = href;
      } else {
        element = document.createElement('link');
        element.rel = rel;
        element.href = href;
        document.head.appendChild(element);
      }
    };

    // Update meta description
    if (description) {
      updateMetaTag('description', description);
    }

    // Update keywords
    if (keywords) {
      updateMetaTag('keywords', keywords);
    }

    // Update Open Graph tags
    if (ogTitle) {
      updateMetaTag('og:title', ogTitle, true);
    }
    if (ogDescription) {
      updateMetaTag('og:description', ogDescription, true);
    }
    if (ogType) {
      updateMetaTag('og:type', ogType, true);
    }
    if (ogUrl) {
      updateMetaTag('og:url', ogUrl, true);
    }

    // Update Twitter Card tags
    if (twitterCard) {
      updateMetaTag('twitter:card', twitterCard);
    }
    if (twitterTitle) {
      updateMetaTag('twitter:title', twitterTitle);
    }
    if (twitterDescription) {
      updateMetaTag('twitter:description', twitterDescription);
    }

    // Update robots directive
    if (robots) {
      updateMetaTag('robots', robots);
    }

    // Update author
    if (author) {
      updateMetaTag('author', author);
    }

    // Update canonical URL
    if (canonical) {
      updateLinkTag('canonical', canonical);
    }

    // Ensure viewport is set
    updateMetaTag('viewport', 'width=device-width, initial-scale=1.0');
  }, [
    title,
    description,
    keywords,
    ogTitle,
    ogDescription,
    ogType,
    ogUrl,
    twitterCard,
    twitterTitle,
    twitterDescription,
    robots,
    lang,
    author,
    canonical,
  ]);
}
