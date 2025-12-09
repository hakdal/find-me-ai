export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 1,
    question: 'Bir krizde nasıl davranırsın?',
    options: [
      'Sakin kalır ve çözüm ararım',
      'Liderlik yapar ve yönlendiririm',
      'Duygusal destek veririm',
      'Yaratıcı çözümler üretirim',
    ],
  },
  {
    id: 2,
    question: 'İdeal Cumartesi gecen nasıl geçer?',
    options: [
      'Arkadaşlarla dışarıda, sosyal',
      'Evde, sakin ve rahat',
      'Yeni şeyler keşfederek',
      'Hedeflerime çalışarak',
    ],
  },
  {
    id: 3,
    question: 'Seni en çok ne motive eder?',
    options: [
      'Başarı ve tanınma',
      'İnsanlara yardım etmek',
      'Özgürlük ve bağımsızlık',
      'Yenilik ve değişim',
    ],
  },
  {
    id: 4,
    question: 'Risk almak hakkında ne düşünürsün?',
    options: [
      'Hesaplı riskler alırım',
      'Büyük riskler büyük ödüller',
      'Güvenli oynarım',
      'Sezgilerime güvenirim',
    ],
  },
  {
    id: 5,
    question: 'Hayat felsefeni en iyi tanımlayan nedir?',
    options: [
      'Cesaret ve kararlılık',
      'Sevgi ve empati',
      'Özgünlük ve yaratıcılık',
      'Güç ve kontrol',
    ],
  },
];
