import { STOREFRONT_GRAYS as G } from "@/lib/layout-patterns";

/** Depoimentos, newsletter e rodapé. */
export function cssFooter(): string {
  return `
    /* Depoimentos (.reviewModule) */
    .reviewModule { padding: 46px 0; background: var(--neutral-background); color: var(--neutral-foreground); }
    .reviewGrid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; }
    @media (max-width: 768px) { .reviewGrid { grid-template-columns: 1fr; } }
    .reviewCard { background: #ffffff; color: ${G.gray900}; padding: 22px; border-radius: var(--irb-radius); border: 1px solid rgba(0, 0, 0, 0.06); }
    .reviewCard__stars { color: #f59e0b; font-size: 16px; margin-bottom: 8px; }
    .reviewCard__text { font-size: 14px; line-height: 1.5; color: ${G.gray700}; margin: 0 0 12px; }
    .reviewCard__author { font-size: 13px; font-weight: 700; color: ${G.gray900}; }

    /* Newsletter (.newsletterModule) */
    .newsletterModule { padding: 44px 0; background: var(--body-background); border-top: 1px solid rgba(0, 0, 0, 0.06); }
    .newsletterBox {
      background: var(--neutral-background);
      color: var(--neutral-foreground);
      border-radius: var(--irb-radius);
      padding: 32px;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
    }
    .newsletterForm { display: flex; gap: 10px; flex: 1 1 320px; max-width: 460px; }
    .newsletterForm input { flex: 1; padding: 12px 14px; border-radius: var(--irb-radius); border: 1px solid ${G.gray300}; font-size: 14px; }
    .newsletterForm button {
      background: var(--btn-primary-background);
      color: var(--btn-primary-color);
      border: 1px solid var(--btn-primary-border);
      padding: 12px 20px;
      border-radius: var(--irb-radius);
      font-weight: 700;
      cursor: pointer;
    }

    /* Rodapé Padrão Tema LIME Irroba */
    .footerContent--top { background: var(--footer-background); color: var(--footer-foreground); padding: 48px 0 42px; }
    .footerGrid {
      display: grid;
      grid-template-columns: 1.25fr 0.85fr 0.9fr 1.1fr;
      gap: 36px;
      align-items: start;
    }
    .footerTitle {
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      margin: 0 0 14px;
    }
    .footerText { font-size: 13.5px; line-height: 1.65; opacity: 0.84; margin: 0 0 18px; }
    .footerSocialTitle { margin-top: 6px; margin-bottom: 10px; font-size: 12px; }
    .footer-social-list {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .footer-social-item a.icon {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 7px 13px;
      border-radius: 999px;
      border: 1px solid color-mix(in srgb, currentColor 26%, transparent);
      background: color-mix(in srgb, currentColor 8%, transparent);
      color: inherit;
      text-decoration: none;
      font-size: 12px;
      font-weight: 600;
      transition: background .15s ease, transform .15s ease;
    }
    .footer-social-item a.icon:hover {
      background: color-mix(in srgb, currentColor 18%, transparent);
      transform: translateY(-1px);
    }
    .footerSummary {
      list-style: none;
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
    }
    .footerSummary::-webkit-details-marker { display: none; }
    .footerSummary .footerTitle { margin: 0; }
    .footerSummary__chevron { display: none; opacity: 0.8; transition: transform .2s ease; }
    @media (min-width: 769px) {
      .footerSummary { pointer-events: none; cursor: default; }
    }
    @media (max-width: 960px) {
      .footerGrid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 28px; }
    }
    @media (max-width: 768px) {
      .footerGrid { grid-template-columns: 1fr; gap: 0; }
      .footerContent__info--store { padding-bottom: 20px; border-bottom: 1px solid color-mix(in srgb, currentColor 14%, transparent); }
      details.footerContent__info { border-bottom: 1px solid color-mix(in srgb, currentColor 14%, transparent); padding: 14px 0; }
      .footerSummary { margin-bottom: 0; cursor: pointer; }
      .footerSummary__chevron { display: inline-flex; }
      details.footerContent__info[open] .footerSummary__chevron { transform: rotate(180deg); }
      details.footerContent__info .footerList { padding-top: 12px; }
    }
    .footerList { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 9px; font-size: 13.5px; }
    .footerList a { color: inherit; text-decoration: none; opacity: 0.84; cursor: pointer; }
    .footerList a:hover { opacity: 1; text-decoration: underline; }
    .service__list__item {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      line-height: 1.5;
      opacity: 0.88;
    }
    .service__list__item svg { flex-shrink: 0; margin-top: 2px; opacity: 0.85; }
    .footer-address-info address { font-style: normal; }
    .footerContent--bottom {
      background: #ffffff;
      color: ${G.gray900};
      border-top: 1px solid rgba(0, 0, 0, 0.08);
      padding: 26px 0;
    }
    .footerSealsLayout {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 24px;
      align-items: start;
    }
    .footerSealsLayout--1 { grid-template-columns: 1fr; }
    .footerSealsLayout--2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    @media (max-width: 820px) {
      .footerSealsLayout { grid-template-columns: 1fr; gap: 18px; }
    }
    .sealsList__item { display: flex; flex-direction: column; gap: 10px; }
    .sealsList__title {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: ${G.gray700};
    }
    .sealsList { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
    .sealsList svg { max-width: 100%; height: auto; display: block; }
    .footer-legal-info {
      background: var(--footerLegal-background);
      color: var(--footerLegal-foreground);
      padding: 18px 0;
      font-size: 12px;
    }
    .footerLegalInner {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 14px 24px;
    }
    .platform-info {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      opacity: 0.9;
    }
    .platform-info .irroba-logo a {
      color: inherit;
      display: inline-flex;
      align-items: center;
      text-decoration: none;
    }
    .store-info {
      display: flex;
      flex-direction: column;
      gap: 3px;
      text-align: right;
      margin-left: auto;
      opacity: 0.9;
    }
    .footer-company-info__text { display: inline-flex; flex-wrap: wrap; gap: 6px; justify-content: flex-end; font-weight: 600; }
    .footer-copyright { display: inline-flex; flex-wrap: wrap; gap: 6px; justify-content: flex-end; }
    @media (max-width: 768px) {
      .footerLegalInner { flex-direction: column; align-items: flex-start; }
      .store-info { text-align: left; margin-left: 0; }
      .footer-company-info__text, .footer-copyright { justify-content: flex-start; }
    }`;
}
