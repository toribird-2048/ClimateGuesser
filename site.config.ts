/**
 * 公開URL・サブパスの一元設定ファイル
 *
 * 公開リンクを変更したい場合は、下の `SITE_URL` だけを書き換えてください。
 * ビルド出力先（dist/...）、アセットのベースパス、ルートからのリダイレクト先、
 * canonical / og:url メタタグがすべて自動で連動します。
 *
 * 設定例:
 * - サブパス公開: 'https://app.toribird.xyz/climateGuessr' または '/climateGuessr/'
 * - パス変更:     'https://app.toribird.xyz/koppen'        または '/koppen/'
 * - ルート公開:   'https://app.toribird.xyz/'              または '/'
 */
export const SITE_URL = 'https://app.toribird.xyz/climateGuessr';

export interface ResolvedSiteTarget {
  origin: string;
  basePath: string;
  subpathDir: string;
  canonicalUrl: string;
  outDir: string;
}

export function resolveSiteTarget(rawInput: string = SITE_URL): ResolvedSiteTarget {
  const trimmed = rawInput.trim();
  let origin = '';
  let rawPath = trimmed;

  if (/^https?:\/\//i.test(trimmed)) {
    const parsed = new URL(trimmed);
    origin = parsed.origin;
    rawPath = parsed.pathname;
  }

  const segments = rawPath
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean);

  const subpathDir = segments.join('/');
  const basePath = subpathDir ? `/${subpathDir}/` : '/';
  const canonicalUrl = origin ? `${origin}${basePath}` : basePath;
  const outDir = subpathDir ? `dist/${subpathDir}` : 'dist';

  return {
    origin,
    basePath,
    subpathDir,
    canonicalUrl,
    outDir,
  };
}
