"use client";

import { Check, Copy, Download, LayoutGrid, Sparkles } from "lucide-react";
import type { CompiledExport } from "@/lib/types/blueprint";
import { stripPreviewAttributes } from "@/lib/irroba-blocks/compiler";
import { absolutizeCaptureUrls, listCaptureUrls, toAbsolutePublicUrl } from "@/lib/public-url";

interface ExportPanelProps {
  id: string;
  compiled: CompiledExport;
  copiedKey: string | null;
  copyText: (key: string, text: string) => void;
  onDownloadBenefitsPng: () => void;
  publicAssetBaseUrl: string | null;
}

/** Aba "Exportar para Irroba": roteiro de implantação com blocos copiáveis. */
export function ExportPanel({
  id,
  compiled,
  copiedKey,
  copyText,
  onDownloadBenefitsPng,
  publicAssetBaseUrl,
}: ExportPanelProps) {
  return (
    <main className="flex-1 overflow-y-auto p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <div>
            <h2 className="text-base font-bold text-emerald-950">
              Pacote de Implantação Pós-Venda · Irroba LIME
            </h2>
            <p className="mt-1 text-xs text-emerald-800">
              Copie os tokens, banners e blocos abaixo para replicar este layout aprovado direto no painel da Irroba.
            </p>
          </div>
          <a
            href={`/api/previews/${id}/csv`}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-500"
          >
            <Download className="h-4 w-4" />
            Baixar Catálogo (.CSV)
          </a>
        </div>

        {/* Passo 1: Configurações LIME */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-bold text-slate-900">
            1. Editar tema &gt; Configurações (Tema LIME)
          </h3>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {compiled.limeSettings.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs"
              >
                <div>
                  <span className="block text-xs font-semibold uppercase text-slate-400">
                    {item.section}
                  </span>
                  <span className="font-medium text-slate-700">{item.field}</span>
                </div>
                <button
                  type="button"
                  onClick={() => copyText(`lime-${idx}`, item.value)}
                  className="flex items-center gap-1 rounded bg-white px-2 py-1 font-mono text-xs font-semibold text-slate-900 shadow-sm hover:bg-slate-100"
                >
                  {item.value}
                  {copiedKey === `lime-${idx}` ? (
                    <Check className="h-3 w-3 text-emerald-600" />
                  ) : (
                    <Copy className="h-3 w-3 text-slate-400" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Passo 2: Checklist Aba Tema */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-bold text-slate-900">
            2. Editar tema &gt; Tema (Editor Visual por Seção)
          </h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {compiled.themeVisualChecklist.map((grp, idx) => (
              <div key={idx} className="rounded-xl border border-slate-200 p-3.5 text-xs">
                <div className="mb-2 font-bold text-slate-800">{grp.section}</div>
                <ul className="space-y-1.5">
                  {grp.controls.map((c, cIdx) => (
                    <li key={cIdx} className="flex justify-between gap-2 text-slate-600">
                      <span>{c.label}:</span>
                      <strong className="text-slate-900">{c.value}</strong>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Passo 3: Banners Nativos (Banner Versão 2) */}
        {compiled.bannerModulesChecklist.length > 0 && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="mb-1 flex items-center gap-2">
              <LayoutGrid className="h-4 w-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900">
                3. Personalizar Loja &gt; Banners (Banner Versão 2)
              </h3>
            </div>
            <p className="mb-3 text-xs text-slate-500">
              Todos os banners (Hero Carrossel, Banner Slim e Banner Secundário) devem ser cadastrados no módulo nativo de Banners da Irroba, nunca em Conteúdo HTML.
            </p>
            <div className="space-y-2.5 text-xs">
              {compiled.bannerModulesChecklist.map((b, idx) => (
                <div
                  key={idx}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-slate-900">{b.slotName}</span>
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
                        Tipo: {b.bannerType}
                      </span>
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700">
                        {b.recommendedSize}
                      </span>
                    </div>
                    <div className="mt-1 text-slate-600">{b.notes}</div>
                    <div className="mt-1 truncate font-mono text-xs text-slate-500">
                      {b.imageUrl}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {b.imageUrl.startsWith("/api/captures/") && (
                      <a
                        href={b.imageUrl}
                        download
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 font-semibold text-white hover:bg-emerald-500"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Baixar
                      </a>
                    )}
                    {(b.imageUrl.startsWith("http") || b.imageUrl.startsWith("/api/captures/")) && (
                      <button
                        type="button"
                        onClick={() =>
                          copyText(
                            `banner-${idx}`,
                            toAbsolutePublicUrl(b.imageUrl, publicAssetBaseUrl, window.location.origin)
                          )
                        }
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        {copiedKey === `banner-${idx}` ? "URL Copiada ✓" : "Copiar URL"}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Passo 4: Tarja Informativa (Nativo LIME) */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                4. {compiled.tarjaChecklist.moduleName}
              </h3>
              <p className="mt-1 text-xs text-slate-500">{compiled.tarjaChecklist.notes}</p>
              <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 font-semibold text-indigo-700">
                  Layout do Item: {compiled.tarjaChecklist.itemLayout}
                </span>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 font-medium text-slate-700">
                  Desktop: {compiled.tarjaChecklist.visibleDesktop} · Tablet:{" "}
                  {compiled.tarjaChecklist.visibleTablet} · Mobile:{" "}
                  {compiled.tarjaChecklist.visibleMobile}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={onDownloadBenefitsPng}
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
            >
              <Download className="h-3.5 w-3.5" />
              Baixar Arte PNG
            </button>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {compiled.tarjaChecklist.items.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs"
              >
                <div className="min-w-0">
                  <div className="font-bold text-slate-800">
                    {idx + 1}. {item.title}
                  </div>
                  <div className="truncate text-xs text-slate-500">{item.description}</div>
                </div>
                {item.imageUrl && (
                  <button
                    type="button"
                    onClick={() => copyText(`tarja-img-${idx}`, item.imageUrl || "")}
                    className="shrink-0 rounded border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    {copiedKey === `tarja-img-${idx}` ? "Copiado ✓" : "Copiar Arte"}
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Passo 5: Listas de Produtos (Nativo Irroba) */}
        {compiled.productListsChecklist.length > 0 && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="text-sm font-bold text-slate-900">
              5. Produtos &gt; Listas de Produtos (Vitrines Nativas)
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Cadastre cada vitrine usando o módulo nativo de Listas de Produtos após importar o CSV do catálogo.
            </p>
            <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
              {compiled.productListsChecklist.map((pl, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs"
                >
                  <div className="font-bold text-slate-900">
                    Vitrine {idx + 1}: {pl.title}
                  </div>
                  <div className="mt-1.5 space-y-0.5 text-xs text-slate-600">
                    <div>
                      Origem: <strong className="text-slate-800">{pl.sourceType}</strong>
                    </div>
                    <div>
                      Exibição: <strong className="text-slate-800">{pl.displayMode}</strong> (
                      {pl.desktopItems} Desktop · {pl.mobileItems} Mobile)
                    </div>
                    <div>
                      Alinhamento: <strong className="text-slate-800">{pl.titleAlign}</strong> ·
                      Limite: <strong className="text-slate-800">{pl.limit} produtos</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Passo 6: Blocos Conteúdo HTML Sofisticados (SunEditor) */}
        <section className="space-y-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900">
                6. Configurações &gt; Módulos &gt; Conteúdo HTML (Seções Editoriais Sofisticadas · SunEditor)
              </h3>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Reservado exclusivamente para seções editoriais personalizadas (Galeria 3:4 com movimento SVG sem JS e Lookbook &amp; Manifesto) — 100% CSS inline pronto para colar em <strong>Mostrar códigos</strong> no SunEditor.
            </p>
          </div>
          {compiled.htmlBlocks.map((blk) => (
            <div key={blk.id} className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-900">{blk.moduleTitle}</h4>
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                      Largura: {blk.recommendedWidth}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{blk.placementNote}</p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    copyText(
                      blk.id,
                      absolutizeCaptureUrls(stripPreviewAttributes(blk.html), publicAssetBaseUrl, window.location.origin)
                    )
                  }
                  className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                >
                  {copiedKey === blk.id ? (
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  {copiedKey === blk.id ? "HTML Copiado!" : "Copiar HTML (SunEditor)"}
                </button>
              </div>
              {!publicAssetBaseUrl && listCaptureUrls(blk.html).length > 0 && (
                <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                  <p className="font-semibold">
                    PUBLIC_ASSET_BASE_URL não configurada: suba as imagens abaixo no gerenciador de arquivos da Irroba e troque as URLs no HTML antes de publicar.
                  </p>
                  <ul className="mt-2 space-y-1">
                    {listCaptureUrls(blk.html).map((u) => (
                      <li key={u} className="flex items-center gap-2">
                        <a href={u} download className="inline-flex items-center gap-1 font-semibold text-amber-800 underline">
                          <Download className="h-3.5 w-3.5" /> Baixar
                        </a>
                        <span className="truncate font-mono text-xs">{u}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <pre className="mt-3 max-h-48 overflow-auto rounded-xl bg-slate-950 p-3.5 text-xs leading-relaxed text-emerald-300">
                <code>{stripPreviewAttributes(blk.html)}</code>
              </pre>
            </div>
          ))}
        </section>

        {/* Passo 7: CSS Personalizado */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                7. Editar tema &gt; Código &gt; CSS Personalizado
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                Refinamentos globais de hover, bordas e arredondamento para o Tema LIME.
              </p>
            </div>
            <button
              type="button"
              onClick={() => copyText("custom-css", compiled.customCss)}
              className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
            >
              {copiedKey === "custom-css" ? (
                <Check className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              {copiedKey === "custom-css" ? "CSS Copiado!" : "Copiar CSS"}
            </button>
          </div>
          <pre className="mt-3 overflow-auto rounded-xl bg-slate-950 p-3.5 text-xs leading-relaxed text-sky-300">
            <code>{compiled.customCss}</code>
          </pre>
        </section>
      </div>
    </main>
  );
}
