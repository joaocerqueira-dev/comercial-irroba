import { escapeAttr, escapeHtml, sanitizeUrl } from "../../sanitize";
import {
  IRROBA_FOOTER_PAYMENT_SEALS_SVG,
  IRROBA_FOOTER_PLATFORM_LOGO_SVG,
  IRROBA_FOOTER_SECURITY_SEAL_SVG,
  IRROBA_FOOTER_SHIPPING_SEAL_SVG,
  IRROBA_ICONS,
} from "../../icons";
import type { StoreBlueprint } from "@/lib/types/blueprint";

/** Rodapé (informações, pagamentos e faixa legal). */
export function renderFooter(bp: StoreBlueprint): string {
  return `  ${renderIrrobaFooterHtml(bp)}`;
}

function renderIrrobaFooterHtml(bp: StoreBlueprint): string {
  const f = bp.footer;
  const institutionalLinks =
    f.institutionalLinks && f.institutionalLinks.length > 0
      ? f.institutionalLinks
      : [
          { label: "Sobre a Loja", href: "#sobre" },
          { label: "Termos de Uso", href: "#termos" },
          { label: "Política de Privacidade", href: "#privacidade" },
          { label: "Troca e Devolução", href: "#trocas" },
          { label: "Depoimentos", href: "#avaliacoes" },
        ];
  const accountLinks =
    f.accountLinks && f.accountLinks.length > 0
      ? f.accountLinks
      : [
          { label: "Entre em Contato", href: "#contato" },
          { label: "Meus Dados", href: "#conta" },
          { label: "Meus Pedidos", href: "#pedidos" },
          { label: "Rastrear Pedido", href: "#rastreio" },
        ];

  const waDigits = (f.whatsapp || "").replace(/\D/g, "");
  const waHref = waDigits
    ? `https://wa.me/${waDigits.startsWith("55") || waDigits.length >= 12 ? waDigits : `55${waDigits}`}`
    : "";
  const igHref = f.instagram ? sanitizeUrl(f.instagram, "") : "";
  const fbHref = f.facebook ? sanitizeUrl(f.facebook, "") : "";

  const socialItems = [
    igHref
      ? `<li class="footer-social-item"><a class="icon" href="${escapeAttr(igHref)}" target="_blank" rel="noopener noreferrer" title="Instagram" aria-label="Instagram">${IRROBA_ICONS.instagram}<span>Instagram</span></a></li>`
      : "",
    fbHref
      ? `<li class="footer-social-item"><a class="icon" href="${escapeAttr(fbHref)}" target="_blank" rel="noopener noreferrer" title="Facebook" aria-label="Facebook">${IRROBA_ICONS.facebook}<span>Facebook</span></a></li>`
      : "",
    waHref
      ? `<li class="footer-social-item"><a class="icon" href="${escapeAttr(waHref)}" target="_blank" rel="noopener noreferrer" title="WhatsApp" aria-label="WhatsApp">${IRROBA_ICONS.whatsapp}<span>WhatsApp</span></a></li>`
      : "",
  ]
    .filter(Boolean)
    .join("");

  const phoneDisplay = f.phone?.trim() || f.whatsapp?.trim() || "";
  const showPay = f.showPaymentSeals !== false;
  const showShip = f.showShippingSeals !== false;
  const showSec = f.showSecuritySeals !== false;
  const visibleSealCount = [showPay, showShip, showSec].filter(Boolean).length;

  const companyMetaParts = [
    f.ownerName?.trim() ? `<span class="footer-owner">${escapeHtml(f.ownerName.trim())}</span>` : "",
    f.cnpj?.trim() ? `<span class="footer-cnpj">CNPJ: ${escapeHtml(f.cnpj.trim())}</span>` : "",
    f.cityState?.trim() ? `<span class="footer-location">${escapeHtml(f.cityState.trim())}</span>` : "",
  ].filter(Boolean);

  const legalCopy = f.legalText?.trim()
    ? escapeHtml(f.legalText.trim())
    : `© ${new Date().getFullYear()} ${escapeHtml(bp.brand.name)}. Todos os direitos reservados.`;

  return `<footer class="footer">
    <div class="footerContent footerContent--top footerContent--layout1">
      <div class="${bp.visualOverrides.footer.width === "full" ? "container-full" : "container"}">
        <div class="footerGrid">
          <div class="footerContent__info footerContent__info--store">
            <h4 class="footerTitle">${escapeHtml(bp.brand.name)}</h4>
            <p class="footerText">${escapeHtml(f.aboutText)}</p>
            ${
              socialItems
                ? `<div class="footerContent__info footerContent__info--social">
              <div class="footerContent__info__title footerTitle footerSocialTitle">Siga nossas redes</div>
              <ul class="footer-social-list list list-index">${socialItems}</ul>
            </div>`
                : ""
            }
          </div>

          <details open class="footerContent__info footerContent__info--information">
            <summary class="footerSummary">
              <span class="footerContent__info__title footerTitle">Institucional</span>
              <span class="footerSummary__chevron">${IRROBA_ICONS.chevronDown}</span>
            </summary>
            <ul class="footerList list list-index">
              ${institutionalLinks
                .map(
                  (lnk) =>
                    `<li><a href="${escapeAttr(sanitizeUrl(lnk.href, "#"))}">${escapeHtml(lnk.label)}</a></li>`
                )
                .join("")}
            </ul>
          </details>

          <details open class="footerContent__info footerContent__info--account">
            <summary class="footerSummary">
              <span class="footerContent__info__title footerTitle">Minha Conta</span>
              <span class="footerSummary__chevron">${IRROBA_ICONS.chevronDown}</span>
            </summary>
            <ul class="footerList list list-index">
              ${accountLinks
                .map((lnk) => {
                  const isAccountAction = /dados|pedido|rastre/i.test(lnk.label);
                  return isAccountAction
                    ? `<li><a href="#conta" data-account-action="login">${escapeHtml(lnk.label)}</a></li>`
                    : `<li><a href="${escapeAttr(sanitizeUrl(lnk.href, "#"))}">${escapeHtml(lnk.label)}</a></li>`;
                })
                .join("")}
            </ul>
          </details>

          <details open class="footerContent__info footerContent__info--contact">
            <summary class="footerSummary">
              <span class="footerContent__info__title footerTitle">Atendimento</span>
              <span class="footerSummary__chevron">${IRROBA_ICONS.chevronDown}</span>
            </summary>
            <ul class="storeOpeningHours footerList list list-index">
              ${
                phoneDisplay
                  ? `<li id="contactTelephone" class="service__list__item">${IRROBA_ICONS.phone}<span>${escapeHtml(phoneDisplay)}</span></li>`
                  : ""
              }
              ${
                f.email
                  ? `<li id="contactEmail" class="service__list__item">${IRROBA_ICONS.mail}<span>${escapeHtml(f.email)}</span></li>`
                  : ""
              }
              ${
                f.openingHours
                  ? `<li class="service__list__item">${IRROBA_ICONS.clock}<span>${escapeHtml(f.openingHours)}</span></li>`
                  : ""
              }
              ${
                f.address
                  ? `<li class="footer-address-content service__list__item">${IRROBA_ICONS.mapPin}<div class="footer-address-info"><address>${escapeHtml(f.address)}</address></div></li>`
                  : ""
              }
              ${
                !phoneDisplay && !f.email && !f.address
                  ? `<li class="service__list__item">Compra 100% Segura • Checkout Transparente</li>`
                  : ""
              }
            </ul>
          </details>
        </div>
      </div>
    </div>
    ${
      visibleSealCount > 0
        ? `<div class="footerContent footerContent--bottom">
      <div class="container footerSealsLayout footerSealsLayout--${visibleSealCount}">
        ${
          showPay
            ? `<div class="sealsList__item sealsList__item--payment">
          <div class="sealsList__title">Formas de pagamento</div>
          <div class="sealsList sealsList--payment">${IRROBA_FOOTER_PAYMENT_SEALS_SVG}</div>
        </div>`
            : ""
        }
        ${
          showShip
            ? `<div class="sealsList__item sealsList__item--shipping">
          <div class="sealsList__title">Formas de envio</div>
          <div class="sealsList sealsList--shipping">${IRROBA_FOOTER_SHIPPING_SEAL_SVG}</div>
        </div>`
            : ""
        }
        ${
          showSec
            ? `<div class="sealsList__item sealsList__item--security">
          <div class="sealsList__title">Site Seguro</div>
          <div class="sealsList sealsList--security">${IRROBA_FOOTER_SECURITY_SEAL_SVG}</div>
        </div>`
            : ""
        }
      </div>
    </div>`
        : ""
    }
    <div class="footer-legal-info">
      <div class="container footerLegalInner">
        <span class="platform-info">
          <span class="irroba-text">Design, desenvolvimento e plataforma</span>
          <span class="irroba-logo">
            <a href="https://www.irroba.com.br/" target="_blank" rel="noopener noreferrer" aria-label="Ver o site da Irroba Ecommerce">${IRROBA_FOOTER_PLATFORM_LOGO_SVG}</a>
          </span>
        </span>
        <span class="store-info">
          ${
            companyMetaParts.length > 0
              ? `<span class="footer-company-info"><span class="footer-company-info__text">${companyMetaParts.join(" · ")}</span></span>`
              : ""
          }
          <span class="footer-copyright">
            <span class="footer-copyright__text">${legalCopy}</span>
            ${f.address ? `<span class="footer-address">${escapeHtml(f.address)}</span>` : ""}
          </span>
        </span>
      </div>
    </div>
  </footer>`;
}
