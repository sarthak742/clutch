'use client'

const paths = [
  ['t01', 'M 155 381 C 330 374, 430 356, 560 336 C 710 313, 830 286, 1010 210 C 1186 136, 1322 88, 1468 42'],
  ['t02', 'M 155 382 C 330 376, 430 364, 560 350 C 704 335, 840 314, 1014 264 C 1178 217, 1316 195, 1468 186'],
  ['t03', 'M 155 383 C 328 379, 432 373, 562 364 C 715 354, 842 347, 1016 326 C 1178 306, 1322 305, 1468 322'],
  ['t04', 'M 155 384 C 330 383, 434 381, 564 376 C 708 369, 840 365, 1018 370 C 1180 374, 1320 392, 1468 420'],
  ['t05', 'M 155 385 C 328 389, 434 390, 564 392 C 716 394, 842 420, 1018 470 C 1188 518, 1324 568, 1468 640'],
  ['t06', 'M 155 386 C 326 394, 432 400, 562 410 C 704 421, 824 465, 998 560 C 1156 646, 1306 724, 1468 812'],
  ['t07', 'M 155 382 C 324 372, 430 348, 560 320 C 718 286, 842 246, 1012 158 C 1168 78, 1318 26, 1468 -28'],
  ['t08', 'M 155 383 C 328 375, 432 354, 562 336 C 718 315, 846 282, 1018 218 C 1182 157, 1322 112, 1468 80'],
  ['t09', 'M 155 383 C 330 378, 434 365, 564 352 C 724 336, 844 320, 1018 278 C 1180 239, 1320 220, 1468 222'],
  ['t10', 'M 155 384 C 330 381, 436 374, 565 366 C 724 356, 850 356, 1020 350 C 1180 344, 1322 350, 1470 374'],
  ['t11', 'M 155 385 C 328 386, 436 386, 564 384 C 724 381, 852 392, 1020 418 C 1180 443, 1322 480, 1468 536'],
  ['t12', 'M 155 386 C 326 391, 434 398, 564 404 C 714 410, 844 452, 1014 532 C 1176 608, 1314 692, 1468 768'],
  ['t13', 'M 155 382 C 330 373, 430 352, 558 328 C 704 301, 840 309, 1010 274 C 1172 241, 1318 218, 1466 198'],
  ['t14', 'M 155 383 C 328 377, 434 371, 560 366 C 718 360, 836 314, 1004 244 C 1160 179, 1308 124, 1464 62'],
  ['t15', 'M 155 385 C 330 386, 436 386, 562 386 C 710 386, 838 408, 1014 448 C 1190 488, 1320 528, 1468 592'],
  ['t16', 'M 155 386 C 326 392, 432 400, 560 414 C 704 430, 826 496, 1000 616 C 1132 707, 1292 780, 1455 844'],
  ['t17', 'M 155 381 C 326 369, 430 341, 558 307 C 710 266, 822 205, 990 112 C 1136 31, 1290 -18, 1468 -58'],
  ['t18', 'M 155 384 C 330 379, 436 370, 566 354 C 702 337, 830 346, 1018 350 C 1170 353, 1316 362, 1468 386'],
  ['t19', 'M 155 385 C 330 387, 434 386, 560 382 C 718 377, 816 440, 1004 514 C 1160 575, 1305 638, 1460 700'],
  ['t20', 'M 155 386 C 326 391, 432 397, 566 408 C 702 419, 820 424, 1016 452 C 1186 476, 1320 514, 1460 574'],
  ['t21', 'M 155 382 C 318 371, 430 332, 574 298 C 740 259, 875 214, 1068 132 C 1244 57, 1358 12, 1490 -38'],
  ['t22', 'M 155 382 C 320 374, 424 344, 568 316 C 736 283, 870 252, 1060 184 C 1216 128, 1358 94, 1490 58'],
  ['t23', 'M 155 383 C 322 376, 426 354, 566 336 C 734 314, 872 290, 1064 242 C 1230 201, 1360 178, 1490 154'],
  ['t24', 'M 155 383 C 326 380, 428 364, 566 354 C 734 342, 870 328, 1064 304 C 1234 283, 1362 282, 1490 284'],
  ['t25', 'M 155 384 C 326 382, 430 374, 566 368 C 734 360, 872 362, 1064 354 C 1234 347, 1360 350, 1490 372'],
  ['t26', 'M 155 385 C 326 385, 430 384, 566 382 C 734 380, 872 390, 1066 414 C 1238 435, 1362 468, 1490 508'],
  ['t27', 'M 155 385 C 324 389, 428 394, 566 398 C 734 403, 872 430, 1064 486 C 1234 536, 1360 586, 1490 654'],
  ['t28', 'M 155 386 C 322 392, 426 404, 568 418 C 736 435, 870 482, 1064 580 C 1230 664, 1360 742, 1490 816'],
  ['t29', 'M 155 383 C 338 377, 452 366, 602 352 C 760 338, 910 336, 1110 320 C 1262 308, 1380 304, 1500 312'],
  ['t30', 'M 155 384 C 338 381, 454 380, 604 378 C 762 376, 914 376, 1110 382 C 1270 386, 1380 402, 1500 428'],
  ['t31', 'M 155 385 C 336 387, 452 392, 604 398 C 762 404, 914 432, 1110 490 C 1270 538, 1382 584, 1500 652'],
  ['t32', 'M 155 382 C 332 372, 450 346, 604 324 C 762 302, 914 288, 1110 246 C 1270 212, 1382 196, 1500 176'],
  ['t33', 'M 150 384 C 338 382, 462 388, 598 374 C 742 359, 838 323, 976 284 C 1128 242, 1284 236, 1500 254'],
  ['t34', 'M 150 385 C 340 384, 464 390, 600 380 C 746 370, 850 371, 994 388 C 1164 408, 1304 458, 1500 536'],
] as const

const nodes = [
  [545, 344, 1.4, '#00aaff'], [614, 358, 1.7, '#4dc8ff'], [690, 370, 2.1, '#00aaff'],
  [760, 376, 1.5, '#4dc8ff'], [834, 374, 2.4, '#00aaff'], [904, 366, 1.6, '#4dc8ff'],
  [986, 348, 1.8, '#00aaff'], [1060, 330, 2.3, '#00aaff'], [1158, 318, 1.7, '#4dc8ff'],
  [1262, 310, 2.8, '#00aaff'], [1368, 304, 2.4, '#00aaff'], [594, 318, 1.3, '#00aaff'],
  [696, 292, 1.9, '#00aaff'], [824, 250, 2.1, '#00aaff'], [938, 218, 1.5, '#4dc8ff'],
  [1086, 164, 2.2, '#00aaff'], [1232, 104, 2.4, '#00aaff'], [1378, 58, 2.7, '#00aaff'],
  [590, 398, 1.3, '#4dc8ff'], [690, 428, 1.8, '#00aaff'], [792, 470, 1.5, '#00aaff'],
  [914, 510, 1.8, '#00aaff'], [1020, 552, 2.1, '#00aaff'], [1120, 596, 1.5, '#4dc8ff'],
  [1216, 636, 2.4, '#00aaff'], [1310, 690, 1.8, '#00aaff'], [650, 354, 1.2, '#00aaff'],
  [872, 406, 1.7, '#4dc8ff'], [1074, 462, 1.3, '#00aaff'], [1244, 518, 1.5, '#4dc8ff'],
  [964, 374, 2.2, '#4dc8ff'],
] as const

export function HeroMesh() {
  return (
    <div className="hero-mesh approved-hero-mesh" aria-hidden="true">
      <svg viewBox="0 0 1440 760" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="heroBlueTrail" x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="#0a1628" stopOpacity="0" />
            <stop offset="28%" stopColor="#1a3a7a" stopOpacity=".28" />
            <stop offset="48%" stopColor="#0088ff" stopOpacity=".86" />
            <stop offset="62%" stopColor="#00cfff" stopOpacity=".72" />
            <stop offset="100%" stopColor="#0055cc" stopOpacity=".16" />
          </linearGradient>
          <linearGradient id="heroCoreTrail" x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="#0a1628" stopOpacity="0" />
            <stop offset="32%" stopColor="#0088ff" stopOpacity=".58" />
            <stop offset="48%" stopColor="#00cfff" stopOpacity=".94" />
            <stop offset="54%" stopColor="#ffffff" stopOpacity=".94" />
            <stop offset="100%" stopColor="#0055cc" stopOpacity=".24" />
          </linearGradient>
          <linearGradient id="heroSilverTrail" x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="#0a1628" stopOpacity="0" />
            <stop offset="34%" stopColor="#1a3a7a" stopOpacity=".22" />
            <stop offset="56%" stopColor="#c0c8d8" stopOpacity=".5" />
            <stop offset="100%" stopColor="#0055cc" stopOpacity=".08" />
          </linearGradient>
          <linearGradient id="heroDeepTrail" x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="rgba(0, 52, 160, 0)" />
            <stop offset="40%" stopColor="#1a3a7a" stopOpacity=".24" />
            <stop offset="100%" stopColor="#1a3a7a" stopOpacity=".16" />
          </linearGradient>
          <filter id="heroSoftGlow" x="-30%" y="-140%" width="170%" height="380%">
            <feGaussianBlur stdDeviation="13" />
          </filter>
          <filter id="heroLineBloom" x="-30%" y="-160%" width="170%" height="420%">
            <feGaussianBlur stdDeviation="2.4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="heroNodeBloom" x="-600%" y="-600%" width="1300%" height="1300%">
            <feGaussianBlur stdDeviation="3.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="heroOriginBloom" x="-900%" y="-900%" width="1900%" height="1900%">
            <feGaussianBlur stdDeviation="15" result="wide" />
            <feGaussianBlur stdDeviation="4" result="tight" />
            <feMerge>
              <feMergeNode in="wide" />
              <feMergeNode in="tight" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {paths.map(([id, d]) => <path key={id} id={`hero-${id}`} d={d} />)}
        </defs>

        <g transform="translate(155 0) scale(.58 1) translate(-155 0)">
          <g className="hero-trail-glow">
            {['t03', 't04', 't05', 't33', 't08', 't12', 't14', 't02', 't09', 't10', 't15', 't20'].map((id, index) => (
              <use key={id} href={`#hero-${id}`} className="hero-trail" stroke={index === 1 || index === 3 ? 'url(#heroCoreTrail)' : index === 5 || index === 6 ? 'url(#heroSilverTrail)' : 'url(#heroBlueTrail)'} strokeWidth={index === 1 ? 13 : index === 3 ? 12 : index < 5 ? 7 : 5} />
            ))}
          </g>

          <g className="hero-trail-sharp">
            {[
              ['t01', 'heroDeepTrail', .72, .35], ['t02', 'heroBlueTrail', .9, .58], ['t03', 'heroBlueTrail', 1.25, .7],
              ['t04', 'heroCoreTrail', 3.2, .78], ['t05', 'heroBlueTrail', 1.65, 1], ['t33', 'heroCoreTrail', 4.4, .95],
              ['t34', 'heroSilverTrail', 1.25, .48], ['t06', 'heroDeepTrail', .82, .42], ['t07', 'heroDeepTrail', .68, .28],
              ['t08', 'heroBlueTrail', 1.35, .68], ['t09', 'heroSilverTrail', 1.05, .62], ['t10', 'heroBlueTrail', .8, .42],
              ['t11', 'heroDeepTrail', .72, .34], ['t12', 'heroSilverTrail', 1.2, .6], ['t13', 'heroBlueTrail', .8, .5],
              ['t14', 'heroBlueTrail', 1, .48], ['t15', 'heroDeepTrail', .72, .34], ['t16', 'heroBlueTrail', .82, .38],
              ['t17', 'heroDeepTrail', .6, .25], ['t18', 'heroBlueTrail', .72, .38], ['t19', 'heroSilverTrail', .82, .4],
              ['t20', 'heroBlueTrail', .72, .34], ['t21', 'heroDeepTrail', .52, .2], ['t22', 'heroBlueTrail', .62, .3],
              ['t23', 'heroDeepTrail', .52, .26], ['t24', 'heroBlueTrail', .6, .32], ['t25', 'heroDeepTrail', .5, .26],
              ['t26', 'heroBlueTrail', .58, .3], ['t27', 'heroSilverTrail', .6, .34], ['t28', 'heroDeepTrail', .52, .23],
              ['t29', 'heroBlueTrail', .55, .26], ['t30', 'heroDeepTrail', .5, .22], ['t31', 'heroSilverTrail', .58, .3],
              ['t32', 'heroBlueTrail', .55, .28],
            ].map(([id, gradient, strokeWidth, opacity]) => (
              <use key={id as string} href={`#hero-${id}`} className="hero-trail" stroke={`url(#${gradient})`} strokeWidth={strokeWidth as number} opacity={opacity as number} />
            ))}
          </g>

          <g>
            <circle cx="155" cy="384" r="2.5" fill="#ffffff" filter="url(#heroOriginBloom)" opacity=".34" />
            <circle cx="155" cy="384" r="9" fill="#00aaff" filter="url(#heroOriginBloom)" opacity=".14" />
            <circle cx="155" cy="384" r="24" fill="#0033aa" filter="url(#heroOriginBloom)" opacity=".05" />
            {nodes.map(([cx, cy, r, fill], index) => (
              <circle key={`${cx}-${cy}`} className="hero-node" cx={cx} cy={cy} r={r} fill={fill} style={{ animationDelay: `${index * -.25}s` }} />
            ))}
          </g>
        </g>
      </svg>
    </div>
  )
}
