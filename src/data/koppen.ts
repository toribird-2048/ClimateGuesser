import type { ClimateData, KoppenCode, KoppenGroup } from '../types/game.ts';

export interface KoppenClassInfo {
  code: KoppenCode;
  group: KoppenGroup;
  nameJa: string;
  shortNameJa: string;
  nameEn: string;
  criteriaSummary: string;
  landscapeClues: string;
}

export interface KoppenGroupInfo {
  group: KoppenGroup;
  nameJa: string;
  nameEn: string;
  swatchHex: string;
  accentTextClass: string;
  accentBorderClass: string;
  accentBgClass: string;
  codes: KoppenCode[];
}

export const KOPPEN_GROUPS: KoppenGroupInfo[] = [
  {
    group: 'A',
    nameJa: '熱帯',
    nameEn: 'Tropical',
    swatchHex: '#10B981',
    accentTextClass: 'text-emerald-300',
    accentBorderClass: 'border-emerald-400/50',
    accentBgClass: 'bg-emerald-500/15',
    codes: ['Af', 'Am', 'Aw'],
  },
  {
    group: 'B',
    nameJa: '乾燥帯',
    nameEn: 'Arid',
    swatchHex: '#F59E0B',
    accentTextClass: 'text-amber-300',
    accentBorderClass: 'border-amber-400/50',
    accentBgClass: 'bg-amber-500/15',
    codes: ['BW', 'BS'],
  },
  {
    group: 'C',
    nameJa: '温帯',
    nameEn: 'Temperate',
    swatchHex: '#38BDF8',
    accentTextClass: 'text-sky-300',
    accentBorderClass: 'border-sky-400/50',
    accentBgClass: 'bg-sky-500/15',
    codes: ['Cfa', 'Cfb', 'Cs', 'Cw'],
  },
  {
    group: 'D',
    nameJa: '冷帯',
    nameEn: 'Continental',
    swatchHex: '#818CF8',
    accentTextClass: 'text-indigo-300',
    accentBorderClass: 'border-indigo-400/50',
    accentBgClass: 'bg-indigo-500/15',
    codes: ['Df', 'Dw'],
  },
  {
    group: 'E',
    nameJa: '寒帯',
    nameEn: 'Polar',
    swatchHex: '#CBD5E1',
    accentTextClass: 'text-slate-200',
    accentBorderClass: 'border-slate-300/50',
    accentBgClass: 'bg-slate-400/15',
    codes: ['ET', 'EF'],
  },
  {
    group: 'H',
    nameJa: '高山気候',
    nameEn: 'Highland',
    swatchHex: '#A78BFA',
    accentTextClass: 'text-violet-300',
    accentBorderClass: 'border-violet-400/50',
    accentBgClass: 'bg-violet-500/15',
    codes: ['H'],
  },
];

export const KOPPEN_CLASSES: Record<KoppenCode, KoppenClassInfo> = {
  Af: {
    code: 'Af',
    group: 'A',
    nameJa: '熱帯雨林気候',
    shortNameJa: '熱帯雨林',
    nameEn: 'Tropical Rainforest',
    criteriaSummary: '最寒月 ≥ 18℃・最少雨月 ≥ 60mm',
    landscapeClues: '一年中うっそうとした常緑広葉樹林、ヤシやバナナ、湿潤な赤土（ラトソル）と濃い緑。',
  },
  Am: {
    code: 'Am',
    group: 'A',
    nameJa: '熱帯モンスーン気候',
    shortNameJa: '熱帯モンスーン',
    nameEn: 'Tropical Monsoon',
    criteriaSummary: '最寒月 ≥ 18℃・短い乾季あり・年降水量大',
    landscapeClues: '強い季節風による多雨林と水田・プランテーション。Afに近い密林だがわずかに乾季の痕跡。',
  },
  Aw: {
    code: 'Aw',
    group: 'A',
    nameJa: 'サバナ気候',
    shortNameJa: 'サバナ',
    nameEn: 'Tropical Savanna',
    criteriaSummary: '最寒月 ≥ 18℃・明確な雨季と乾季',
    landscapeClues: '背の高い草原と疎林（アカシア・バオバブ等）、乾季には枯れた草地と赤茶けた大地。',
  },
  BW: {
    code: 'BW',
    group: 'B',
    nameJa: '砂漠気候',
    shortNameJa: '砂漠',
    nameEn: 'Desert',
    criteriaSummary: '年降水量が乾燥限界の 1/2 未満',
    landscapeClues: '砂丘・岩石砂漠・裸地が広がり植生が極めて乏しい。平らな屋根や日干し煉瓦・白壁の建築。',
  },
  BS: {
    code: 'BS',
    group: 'B',
    nameJa: 'ステップ気候',
    shortNameJa: 'ステップ',
    nameEn: 'Steppe',
    criteriaSummary: '年降水量が乾燥限界未満かつ 1/2 以上',
    landscapeClues: '背の低い草原と低木が続く半乾燥地帯。牧草地や大規模な小麦畑・乾燥した丘陵。',
  },
  Cfa: {
    code: 'Cfa',
    group: 'C',
    nameJa: '温暖湿潤気候',
    shortNameJa: '温暖湿潤',
    nameEn: 'Humid Subtropical',
    criteriaSummary: '最寒月 -3〜18℃・年中湿潤・最暖月 ≥ 22℃',
    landscapeClues: '照葉樹林・混合林・水田や豊かな農地。蒸し暑い夏と四季のメリハリがある東岸地域。',
  },
  Cfb: {
    code: 'Cfb',
    group: 'C',
    nameJa: '西岸海洋性気候',
    shortNameJa: '西岸海洋性',
    nameEn: 'Oceanic',
    criteriaSummary: '最寒月 -3〜18℃・年中湿潤・最暖月 < 22℃',
    landscapeClues: '年間を通じて緑豊かな牧草地と落葉広葉樹林。曇天が多く急勾配の屋根や石造・煉瓦造の街並み。',
  },
  Cs: {
    code: 'Cs',
    group: 'C',
    nameJa: '地中海性気候',
    shortNameJa: '地中海性',
    nameEn: 'Mediterranean',
    criteriaSummary: '最寒月 -3〜18℃・夏に明確な乾季',
    landscapeClues: 'オリーブ・ブドウ・柑橘類・イトスギなどの硬葉樹。夏の強い日差しに映える白壁とオレンジ瓦屋根。',
  },
  Cw: {
    code: 'Cw',
    group: 'C',
    nameJa: '温帯冬季少雨気候',
    shortNameJa: '温帯冬季少雨',
    nameEn: 'Monsoon-Influenced Humid Subtropical',
    criteriaSummary: '最寒月 -3〜18℃・冬に顕著な乾季',
    landscapeClues: 'インド北部・中国南西部・メキシコ高原・南部アフリカ高原など。夏の雨季に潤う水田・棚田・亜熱帯林と、冬の乾季に乾いた丘陵や高原草原。',
  },
  Df: {
    code: 'Df',
    group: 'D',
    nameJa: '冷帯湿潤気候',
    shortNameJa: '冷帯湿潤',
    nameEn: 'Subarctic / Humid Continental',
    criteriaSummary: '最寒月 ≤ -3℃・最暖月 ≥ 10℃・年中降水',
    landscapeClues: '広大な針葉樹林（タイガ）や白樺林、湖沼。防寒性の高い木造住宅や急傾斜の屋根、雪の痕跡。',
  },
  Dw: {
    code: 'Dw',
    group: 'D',
    nameJa: '冷帯冬季少雨気候',
    shortNameJa: '冷帯冬季少雨',
    nameEn: 'Dry-Winter Continental',
    criteriaSummary: '最寒月 ≤ -3℃・最暖月 ≥ 10℃・冬に顕著な乾季',
    landscapeClues: 'シベリア東部や内陸アジアの乾いた草原・落葉針葉樹（カラマツ）林。気温年較差が極めて大きい内陸景観。',
  },
  ET: {
    code: 'ET',
    group: 'E',
    nameJa: 'ツンドラ気候',
    shortNameJa: 'ツンドラ',
    nameEn: 'Tundra',
    criteriaSummary: '最暖月 0℃以上 10℃未満（無樹木気候）',
    landscapeClues: '樹木が育たずコケ・地衣類・岩肌・雪原が広がる高緯度または高山帯。高床建築やカラフルな極地集落。',
  },
  EF: {
    code: 'EF',
    group: 'E',
    nameJa: '氷雪気候',
    shortNameJa: '氷雪',
    nameEn: 'Ice Cap',
    criteriaSummary: '最暖月平均気温が 0℃未満',
    landscapeClues: '一年中氷床・氷河・万年雪に覆われた極寒の世界。植生は皆無で観測基地や雪上車が手がかり。',
  },
  H: {
    code: 'H',
    group: 'H',
    nameJa: '高山気候',
    shortNameJa: '高山',
    nameEn: 'Highland',
    criteriaSummary: '低・中緯度（緯度55°未満）の標高 2,500m 以上の高地',
    landscapeClues: 'アンデス・チベット・ヒマラヤ・エチオピア高原などの高標高地形。急峻な山脈・高原盆地・段々畑・高山草原や氷河峰。',
  },
};

export const ALL_KOPPEN_CODES: KoppenCode[] = [
  'Af',
  'Am',
  'Aw',
  'BW',
  'BS',
  'Cfa',
  'Cfb',
  'Cs',
  'Cw',
  'Df',
  'Dw',
  'ET',
  'EF',
  'H',
];

export function getGroupForCode(code: KoppenCode): KoppenGroupInfo {
  const group = KOPPEN_CLASSES[code].group;
  return KOPPEN_GROUPS.find((g) => g.group === group)!;
}

export function getLatitudeBandJa(lat: number): {
  hemisphere: string;
  band: string;
  detail: string;
} {
  const absLat = Math.abs(lat);
  const hemisphere = lat >= 0 ? '北半球' : '南半球';
  if (absLat < 15) {
    return { hemisphere, band: '赤道付近（低緯度）', detail: '緯度 0°〜15° 付近' };
  }
  if (absLat < 30) {
    return { hemisphere, band: '亜熱帯・回帰線帯（低〜中緯度）', detail: '緯度 15°〜30° 付近' };
  }
  if (absLat < 45) {
    return { hemisphere, band: '温帯中緯度', detail: '緯度 30°〜45° 付近' };
  }
  if (absLat < 60) {
    return { hemisphere, band: '高めの緯度帯（中〜高緯度）', detail: '緯度 45°〜60° 付近' };
  }
  return { hemisphere, band: '極圏・高緯度帯', detail: '緯度 60° 以上' };
}

/**
 * Standard Köppen-Geiger climate classifier (Peel et al. / textbook -3°C C/D threshold)
 * mapped onto the 14 target classes:
 * Af, Am, Aw, BW, BS, Cfa, Cfb, Cs, Cw, Df, Dw, ET, EF, H.
 */
export function classifyKoppen12(
  monthlyTempC: number[],
  monthlyPrecipMm: number[],
  lat: number,
  elevation = 0
): ClimateData {
  if (monthlyTempC.length !== 12 || monthlyPrecipMm.length !== 12) {
    throw new Error('Expected 12 monthly climate values.');
  }

  const annualMeanTemp = monthlyTempC.reduce((a, b) => a + b, 0) / 12;
  const annualPrecip = monthlyPrecipMm.reduce((a, b) => a + b, 0);

  let maxTemp = -Infinity;
  let minTemp = Infinity;
  let warmestMonth = 1;
  let coldestMonth = 1;

  for (let i = 0; i < 12; i++) {
    if (monthlyTempC[i] > maxTemp) {
      maxTemp = monthlyTempC[i];
      warmestMonth = i + 1;
    }
    if (monthlyTempC[i] < minTemp) {
      minTemp = monthlyTempC[i];
      coldestMonth = i + 1;
    }
  }

  // High-sun (summer) & low-sun (winter) 6-month periods
  const summerIndices = lat >= 0 ? [3, 4, 5, 6, 7, 8] : [9, 10, 11, 0, 1, 2];
  const winterIndices = lat >= 0 ? [9, 10, 11, 0, 1, 2] : [3, 4, 5, 6, 7, 8];

  const summerPrecips = summerIndices.map((idx) => monthlyPrecipMm[idx]);
  const winterPrecips = winterIndices.map((idx) => monthlyPrecipMm[idx]);

  const pSummer = summerPrecips.reduce((a, b) => a + b, 0);
  const pWinter = winterPrecips.reduce((a, b) => a + b, 0);
  const pSdry = Math.min(...summerPrecips);
  const pSwet = Math.max(...summerPrecips);
  const pWdry = Math.min(...winterPrecips);
  const pWwet = Math.max(...winterPrecips);
  const pDry = Math.min(...monthlyPrecipMm);

  const r1 = (n: number) => Math.round(n * 10) / 10;
  const r0 = (n: number) => Math.round(n);

  const reasonSteps: string[] = [];
  let climateCode: KoppenCode | null = null;
  let rawCode = '';

  // 0. Highland (H): High-elevation mountain/plateau zones in low & mid latitudes
  // (Excludes polar ice sheets at |lat| >= 55° so Greenland/Antarctica remain EF/ET)
  if (Math.abs(lat) < 55 && elevation >= 2500) {
    climateCode = 'H';
    rawCode = 'H';
    reasonSteps.push(
      `低〜中緯度（緯度 ${Math.abs(lat).toFixed(1)}°）かつ標高 ${r0(elevation).toLocaleString()}m（2,500m以上）の高地のため「高山気候（H）」に分類。`
    );
    reasonSteps.push(
      `年平均気温 ${r1(annualMeanTemp)}℃（最暖月 ${r1(maxTemp)}℃／最寒月 ${r1(minTemp)}℃）・年降水量 ${r0(annualPrecip)}mm と、標高による冷涼な気候特性を示しています。`
    );
  } else if (maxTemp < 10) {
    // 1. Polar (E): T_max < 10°C
    reasonSteps.push(`最暖月平均気温が ${r1(maxTemp)}℃（10℃未満）のため「寒帯（E）」に分類。`);
    if (maxTemp < 0) {
      climateCode = 'EF';
      rawCode = 'EF';
      reasonSteps.push(`最暖月平均気温が 0℃未満（${r1(maxTemp)}℃）のため「氷雪気候（EF）」と判定。`);
    } else {
      climateCode = 'ET';
      rawCode = 'ET';
      reasonSteps.push(`最暖月平均気温が 0℃以上 10℃未満（${r1(maxTemp)}℃）のため「ツンドラ気候（ET）」と判定。`);
    }
  } else {
    // 2. Arid (B): compare annual precip against dryness threshold P_th
    let pTh: number;
    let seasonLabel: string;
    if (annualPrecip > 0 && pSummer >= 0.7 * annualPrecip) {
      pTh = 20 * annualMeanTemp + 280;
      seasonLabel = '夏雨型（夏半年降水 ≥ 70%）';
    } else if (annualPrecip > 0 && pWinter >= 0.7 * annualPrecip) {
      pTh = 20 * annualMeanTemp;
      seasonLabel = '冬雨型（冬半年降水 ≥ 70%）';
    } else {
      pTh = 20 * annualMeanTemp + 140;
      seasonLabel = '年中均等型';
    }
    pTh = Math.max(0, pTh);

    if (annualPrecip < pTh) {
      reasonSteps.push(
        `年降水量 ${r0(annualPrecip)}mm が乾燥限界 ${r0(pTh)}mm（${seasonLabel}・年平均気温 ${r1(annualMeanTemp)}℃）未満のため「乾燥帯（B）」に分類。`
      );
      if (annualPrecip < pTh * 0.5) {
        climateCode = 'BW';
        rawCode = 'BW';
        reasonSteps.push(
          `年降水量 ${r0(annualPrecip)}mm が乾燥限界の半分（${r0(pTh * 0.5)}mm）未満のため「砂漠気候（BW）」と判定。`
        );
      } else {
        climateCode = 'BS';
        rawCode = 'BS';
        reasonSteps.push(
          `年降水量 ${r0(annualPrecip)}mm が乾燥限界の半分（${r0(pTh * 0.5)}mm）以上のため「ステップ気候（BS）」と判定。`
        );
      }
    } else if (minTemp >= 18) {
      // 3. Tropical (A)
      reasonSteps.push(
        `乾燥限界（${r0(pTh)}mm）を上回り、最寒月平均気温が ${r1(minTemp)}℃（18℃以上）のため「熱帯（A）」に分類。`
      );
      const amThreshold = 100 - annualPrecip / 25;
      if (pDry >= 60) {
        climateCode = 'Af';
        rawCode = 'Af';
        reasonSteps.push(
          `最少雨月降水量が ${r0(pDry)}mm（60mm以上）のため「熱帯雨林気候（Af）」と判定。`
        );
      } else if (pDry >= amThreshold) {
        climateCode = 'Am';
        rawCode = 'Am';
        reasonSteps.push(
          `最少雨月降水量 ${r0(pDry)}mm は 60mm 未満だが、年降水量 ${r0(annualPrecip)}mm に基づく境界（${r1(amThreshold)}mm）以上のため「熱帯モンスーン気候（Am）」と判定。`
        );
      } else {
        climateCode = 'Aw';
        rawCode = 'Aw';
        reasonSteps.push(
          `最少雨月降水量 ${r0(pDry)}mm が境界（${r1(amThreshold)}mm）を下回り明確な乾季があるため「サバナ気候（Aw）」と判定。`
        );
      }
    } else if (minTemp > -3) {
      // 4. Temperate (C)
      reasonSteps.push(
        `年降水量 ${r0(annualPrecip)}mm（乾燥限界 ${r0(pTh)}mm 以上）、最寒月平均気温 ${r1(minTemp)}℃（-3℃超〜18℃未満）のため「温帯（C）」に分類。`
      );
      const isDrySummer = pSdry < 40 && pSdry < pWwet / 3;
      const isDryWinter = pWdry < pSwet / 10;

      if (isDrySummer && (!isDryWinter || pWinter >= pSummer)) {
        climateCode = 'Cs';
        rawCode = 'Cs';
        reasonSteps.push(
          `夏の最少雨月（${r0(pSdry)}mm）が 40mm 未満かつ冬の最多雨月（${r0(pWwet)}mm）の 1/3 未満のため「地中海性気候（Cs）」と判定。`
        );
      } else if (isDryWinter) {
        climateCode = 'Cw';
        rawCode = 'Cw';
        reasonSteps.push(
          `冬の最少雨月（${r0(pWdry)}mm）が夏の最多雨月（${r0(pSwet)}mm）の 1/10 未満のため「温帯冬季少雨気候（Cw）」と判定。`
        );
      } else if (maxTemp >= 22) {
        climateCode = 'Cfa';
        rawCode = 'Cfa';
        reasonSteps.push(
          `明瞭な乾季がなく（年中湿潤）、最暖月平均気温が ${r1(maxTemp)}℃（22℃以上）のため「温暖湿潤気候（Cfa）」と判定。`
        );
      } else {
        climateCode = 'Cfb';
        rawCode = 'Cfb';
        reasonSteps.push(
          `明瞭な乾季がなく（年中湿潤）、最暖月平均気温が ${r1(maxTemp)}℃（22℃未満）のため「西岸海洋性気候（Cfb）」と判定。`
        );
      }
    } else {
      // 5. Continental / Subarctic (D): T_min <= -3 and T_max >= 10
      reasonSteps.push(
        `最暖月平均気温 ${r1(maxTemp)}℃（10℃以上）かつ最寒月平均気温 ${r1(minTemp)}℃（-3℃以下）のため「冷帯（D）」に分類。`
      );
      if (pWdry < pSwet / 10) {
        climateCode = 'Dw';
        rawCode = 'Dw';
        reasonSteps.push(
          `冬の最少雨月降水量（${r0(pWdry)}mm）が夏の最多雨月（${r0(pSwet)}mm）の 1/10 未満のため「冷帯冬季少雨気候（Dw）」と判定。`
        );
      } else {
        climateCode = 'Df';
        rawCode = 'Df';
        reasonSteps.push(
          `冬季の顕著な乾季条件に該当せず、年間を通じて降水があるため「冷帯湿潤気候（Df）」と判定。`
        );
      }
    }
  }

  return {
    climateCode,
    rawCode,
    monthlyTempC: monthlyTempC.map(r1),
    monthlyPrecipMm: monthlyPrecipMm.map(r0),
    elevation: Math.round(elevation),
    annualMeanTemp: r1(annualMeanTemp),
    annualPrecip: r0(annualPrecip),
    maxTemp: r1(maxTemp),
    minTemp: r1(minTemp),
    warmestMonth,
    coldestMonth,
    reasonSteps,
  };
}
