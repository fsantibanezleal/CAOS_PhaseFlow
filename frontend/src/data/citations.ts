// Every source the app cites, with a real DOI or arXiv id. Nothing here is decorative: each entry is
// used by an inline <Cite> somewhere, and the research dossiers behind them are persisted in
// Transcribed from the dated research dossiers, which are kept outside this repo.

import type { Citation } from '@fasl-work/caos-app-shell';

export const CITATIONS: Citation[] = [
  {
    id: 'lerchs1965',
    label: 'Lerchs and Grossmann 1965',
    citation: 'Lerchs, H. and Grossmann, I. F. (1965). Optimum design of open-pit mines. Transactions C.I.M. 58, 47-54.',
  },
  {
    id: 'johnson1968',
    label: 'Johnson 1968',
    citation: 'Johnson, T. B. (1968). Optimum open pit mine production scheduling. PhD thesis, Operations Research Department, University of California, Berkeley.',
    doi: '10.21236/AD0672094',
  },
  {
    id: 'caccetta2003',
    label: 'Caccetta and Hill 2003',
    citation: 'Caccetta, L. and Hill, S. P. (2003). An application of branch and cut to open pit mine scheduling. Journal of Global Optimization 27(2-3), 349-365.',
    doi: '10.1023/A:1024835022186',
  },
  {
    id: 'newman2010',
    label: 'Newman et al. 2010',
    citation: 'Newman, A. M., Rubio, E., Caro, R., Weintraub, A. and Eurek, K. (2010). A review of operations research in mine planning. Interfaces 40(3), 222-245.',
    doi: '10.1287/inte.1090.0492',
  },
  {
    id: 'bienstock2010',
    label: 'Bienstock and Zuckerberg 2010',
    citation: 'Bienstock, D. and Zuckerberg, M. (2010). Solving LP relaxations of large-scale precedence constrained problems. Integer Programming and Combinatorial Optimization (IPCO 2010), LNCS 6080, 1-14.',
    doi: '10.1007/978-3-642-13036-6_1',
  },
  {
    id: 'cullenbine2011',
    label: 'Cullenbine et al. 2011',
    citation: 'Cullenbine, C., Wood, R. K. and Newman, A. (2011). A sliding time window heuristic for open pit mine block sequencing. Optimization Letters 5, 365-377.',
    doi: '10.1007/s11590-011-0306-2',
  },
  {
    id: 'chicoisne2012',
    label: 'Chicoisne et al. 2012',
    citation: 'Chicoisne, R., Espinoza, D., Goycoolea, M., Moreno, E. and Rubio, E. (2012). A new algorithm for the open-pit mine production scheduling problem. Operations Research 60(3), 517-528.',
    doi: '10.1287/opre.1120.1050',
  },
  {
    id: 'lamghari2012',
    label: 'Lamghari and Dimitrakopoulos 2012',
    citation: 'Lamghari, A. and Dimitrakopoulos, R. (2012). A diversified Tabu search approach for the open-pit mine production scheduling problem with metal uncertainty. European Journal of Operational Research 222(3), 642-652.',
    doi: '10.1016/j.ejor.2012.05.029',
  },
  {
    id: 'espinoza2013',
    label: 'Espinoza et al. 2013',
    citation: 'Espinoza, D., Goycoolea, M., Moreno, E. and Newman, A. (2013). MineLib: a library of open pit mining problems. Annals of Operations Research 206(1), 93-114.',
    doi: '10.1007/s10479-012-1258-3',
  },
  {
    id: 'ramazan2013',
    label: 'Ramazan and Dimitrakopoulos 2013',
    citation: 'Ramazan, S. and Dimitrakopoulos, R. (2013). Production scheduling with uncertain supply: a new solution to the open pit mining problem. Optimization and Engineering 14(2), 361-380.',
    doi: '10.1007/s11081-012-9186-2',
  },
  {
    id: 'lambert2014',
    label: 'Lambert et al. 2014',
    citation: 'Lambert, W. B., Brickey, A., Newman, A. M. and Eurek, K. (2014). Open-pit block-sequencing formulations: a tutorial. Interfaces 44(2), 127-142.',
    doi: '10.1287/inte.2013.0731',
  },
  {
    id: 'meagher2014',
    label: 'Meagher et al. 2014',
    citation: 'Meagher, C., Dimitrakopoulos, R. and Avis, D. (2014). Optimized open pit mine design, pushbacks and the gap problem, a review. Journal of Mining Science 50(3), 508-526.',
    doi: '10.1134/S1062739114030132',
  },
  {
    id: 'morales2015',
    label: 'Morales et al. 2015',
    citation: 'Morales, N., Jelvez, E., Nancel-Penard, P., Marinho, A. and Guimaraes, O. (2015). A comparison of conventional and direct block scheduling methods for open pit mine production scheduling. APCOM 2015, 1040-1051.',
    url: 'https://delphoslab.cl/Publicaciones/2015/MJNMG_A2015.pdf',
  },
  {
    id: 'goodfellow2016',
    label: 'Goodfellow and Dimitrakopoulos 2016',
    citation: 'Goodfellow, R. C. and Dimitrakopoulos, R. (2016). Global optimization of open pit mining complexes with uncertainty. Applied Soft Computing 40, 292-304.',
    doi: '10.1016/j.asoc.2015.11.038',
  },
  {
    id: 'moreno2017',
    label: 'Moreno et al. 2017',
    citation: 'Moreno, E., Rezakhah, M., Newman, A. and Ferreira, F. (2017). Linear models for stockpiling in open-pit mine production scheduling problems. European Journal of Operational Research 260(1), 212-221.',
    doi: '10.1016/j.ejor.2016.12.014',
  },
  {
    id: 'munoz2017',
    label: 'Munoz et al. 2017',
    citation: 'Munoz, G., Espinoza, D., Goycoolea, M., Moreno, E., Queyranne, M. and Rivera Letelier, O. (2017). A study of the Bienstock-Zuckerberg algorithm: applications in mining and resource constrained project scheduling. Computational Optimization and Applications 69, 501-534.',
    doi: '10.1007/s10589-017-9946-1',
  },
  {
    id: 'bai2018',
    label: 'Bai et al. 2018',
    citation: 'Bai, X., Marcotte, D., Gamache, M., Gregory, D. and Lapworth, A. (2018). Automatic generation of feasible mining pushbacks for open pit strategic planning. Journal of the Southern African Institute of Mining and Metallurgy 118(5), 515-530.',
    doi: '10.17159/2411-9717/2018/v118n5a8',
  },
  {
    id: 'jelvez2018',
    label: 'Jelvez et al. 2018',
    citation: 'Jelvez, E., Morales, N. and Nancel-Penard, P. (2018). Open-pit mine production scheduling: improvements to MineLib library problems. Proceedings of MPES 2018, Springer, 223-231.',
    doi: '10.1007/978-3-319-99220-4_18',
  },
  {
    id: 'rezakhah2020a',
    label: 'Rezakhah et al. 2020',
    citation: 'Rezakhah, M., Moreno, E. and Newman, A. (2020). Practical performance of an open pit mine scheduling model considering blending and stockpiling. Computers and Operations Research 115, 104638.',
    doi: '10.1016/j.cor.2019.02.001',
  },
  {
    id: 'rezakhah2020b',
    label: 'Rezakhah and Newman 2020',
    citation: 'Rezakhah, M. and Newman, A. (2020). Open pit mine planning with degradation due to stockpiling. Computers and Operations Research 115, 104589.',
    doi: '10.1016/j.cor.2018.11.009',
  },
  {
    id: 'blom2024',
    label: 'Blom et al. 2024',
    citation: 'Blom, M., Pearce, A. R. and Cote, P. (2024). Long-term open-pit mine planning with large neighbourhood search. arXiv:2403.18213.',
    url: 'https://arxiv.org/abs/2403.18213',
  },
  {
    id: 'oreblocks',
    label: 'oreblocks',
    citation: 'Santibanez-Leal, F. (2026). oreblocks: synthetic 3-D ore-body block models of the MineLib nature, and their scheduling. Python package.',
    url: 'https://pypi.org/project/oreblocks/',
  },
];
