// indian-study-channels.ts - Enhanced list of Indian educational YouTube channels

export interface Channel {
  id: string;
  name: string;
  handle: string;
  category: string;
  subcategory: string;
  description: string;
  language: string;
  examFocus: string[];
  verified: boolean;
  subscriberCount?: string; // Optional field for popularity indication
}

export const INDIAN_STUDY_CHANNELS: Channel[] = [
  // JEE Preparation Channels
  {
    id: 'UCF6FRcQgdGhcN7Y7UUhzMww', // Physics Wallah
    name: 'Physics Wallah',
    handle: '@PhysicsWallah',
    category: 'JEE Preparation',
    subcategory: 'Physics',
    description: 'Complete JEE/NEET preparation with Alakh Pandey',
    language: 'Hindi',
    examFocus: ['JEE Main', 'JEE Advanced', 'NEET'],
    verified: true,
    subscriberCount: '9M+'
  },
  {
    id: 'UCBVKpIdCrp8tgADogtCpWBA', // Eduniti
    name: 'Eduniti',
    handle: '@Eduniti',
    category: 'JEE Preparation',
    subcategory: 'Physics',
    description: 'Physics concepts by Mohit Goenka for JEE aspirants',
    language: 'Hindi',
    examFocus: ['JEE Main', 'JEE Advanced'],
    verified: true
  },
  {
    id: 'UCs6sf4iRhhE-Adl8R_NdJLA', // Competishun
    name: 'Competishun',
    handle: '@Competishun',
    category: 'JEE Preparation',
    subcategory: 'All Subjects',
    description: 'Complete JEE preparation platform',
    language: 'Hindi',
    examFocus: ['JEE Main', 'JEE Advanced'],
    verified: true
  },
  {
    id: 'UC4gKWR53xDzybVBqTIbOYpQ', // Vedantu
    name: 'Vedantu',
    handle: '@VedantuOfficial',
    category: 'Multi-Level',
    subcategory: 'All Subjects',
    description: 'Live online learning for JEE, NEET, CBSE',
    language: 'Hindi/English',
    examFocus: ['JEE Main', 'JEE Advanced', 'NEET', 'CBSE'],
    verified: true
  },
  {
    id: 'UC5JgdKdGsvMDcp_FdeAz-tw', // Unacademy
    name: 'Unacademy',
    handle: '@Unacademy',
    category: 'Competitive Exams',
    subcategory: 'All Subjects',
    description: 'India\'s largest learning platform',
    language: 'Hindi/English',
    examFocus: ['JEE Main', 'JEE Advanced', 'NEET', 'UPSC', 'Banking'],
    verified: true
  },
  {
    id: 'UC0cCStYuI7tY8dFX-H7fWxQ', // Aakash BYJU'S
    name: 'Aakash BYJU\'S',
    handle: '@AakashByjus',
    category: 'JEE Preparation',
    subcategory: 'All Subjects',
    description: 'Premier coaching institute for medical and engineering',
    language: 'Hindi/English',
    examFocus: ['JEE Main', 'JEE Advanced', 'NEET'],
    verified: true
  },
  {
    id: 'UCq71NRTk3D2AHf2SRWyidUw', // Allen Career Institute
    name: 'Allen Career Institute',
    handle: '@ALLENCareerInst',
    category: 'JEE Preparation',
    subcategory: 'All Subjects',
    description: 'Leading coaching institute from Kota',
    language: 'Hindi/English',
    examFocus: ['JEE Main', 'JEE Advanced', 'NEET'],
    verified: true
  },
  {
    id: 'UC72cwDDbJ6A3yYYKGzEwTtA', // Resonance
    name: 'Resonance Edu',
    handle: '@ResonanceEdu',
    category: 'JEE Preparation',
    subcategory: 'All Subjects',
    description: 'Excellence in JEE and NEET preparation',
    language: 'Hindi/English',
    examFocus: ['JEE Main', 'JEE Advanced', 'NEET'],
    verified: true
  },
  {
    id: 'UCHnQ5yzOiHaXgGTnMZGE8nw', // FIITJEE
    name: 'FIITJEE',
    handle: '@FIITJEE',
    category: 'JEE Preparation',
    subcategory: 'All Subjects',
    description: 'Forum for IIT Joint Entrance Examination',
    language: 'English',
    examFocus: ['JEE Main', 'JEE Advanced'],
    verified: true
  },
  {
    id: 'UCrI-WaCcneKOKlWX-PbThgw', // Etoos Education
    name: 'Etoos Education',
    handle: '@EtoosEducation',
    category: 'JEE Preparation',
    subcategory: 'All Subjects',
    description: 'Quality education with experienced faculty',
    language: 'Hindi/English',
    examFocus: ['JEE Main', 'JEE Advanced', 'NEET'],
    verified: true
  },
  {
    id: 'UCoz5e2NykiRNYcIsNhzYBTQ', // Physics Galaxy
    name: 'Physics Galaxy',
    handle: '@PhysicsGalaxy',
    category: 'JEE Preparation',
    subcategory: 'Physics',
    description: 'Physics concepts by Ashish Arora',
    language: 'Hindi',
    examFocus: ['JEE Main', 'JEE Advanced'],
    verified: true
  },

  // Additional Popular JEE Preparation Channels
  {
    id: 'UC1-ZdFLBukC6fTZ8QRWvpDw',
    name: 'Sachin Rana [IITB]',
    handle: '@sachinranaiitb',
    category: 'JEE Preparation',
    subcategory: 'Chemistry',
    description: 'Organic Chemistry for JEE by IIT Bombay graduate',
    language: 'Hindi/English',
    examFocus: ['JEE Main', 'JEE Advanced'],
    verified: true
  },
  {
    id: 'UCDG_YP69cl42ly3pPy8-Liw',
    name: 'Vora Classes',
    handle: '@voraclasses',
    category: 'JEE Preparation',
    subcategory: 'All Subjects',
    description: 'Comprehensive one-shot lectures for JEE Main and Advanced',
    language: 'Hindi',
    examFocus: ['JEE Main', 'JEE Advanced'],
    verified: true
  },
  {
    id: 'UCddnJhXMUxzHoH8AZkZSd8w',
    name: 'eSaral - JEE, NEET, Class 9 & 10 Preparation',
    handle: '@eSaral',
    category: 'JEE Preparation',
    subcategory: 'All Subjects',
    description: 'JEE and NEET preparation with revision playlists',
    language: 'Hindi/English',
    examFocus: ['JEE Main', 'JEE Advanced', 'NEET'],
    verified: true
  },
  {
    id: 'UCpyc1eTpM1cA3P0ZWym4clw',
    name: 'Mohit Tyagi',
    handle: '@MohitTyagi',
    category: 'JEE Preparation',
    subcategory: 'Mathematics',
    description: 'Mathematics for JEE Main and Advanced',
    language: 'Hindi',
    examFocus: ['JEE Main', 'JEE Advanced'],
    verified: true
  },
  {
    id: 'UCSZVTk6wAtmorpBjP_uEjpw',
    name: 'Infinity Learn JEE',
    handle: '@InfinityLearnJEE',
    category: 'JEE Preparation',
    subcategory: 'All Subjects',
    description: 'India\'s leading JEE preparation YouTube channel',
    language: 'English',
    examFocus: ['JEE Main', 'JEE Advanced'],
    verified: true
  },
  {
    id: 'UCY88kePn2CNnQWunlev2Quw',
    name: 'NUCLEUS',
    handle: '@nucleuseducation8295',
    category: 'JEE Preparation',
    subcategory: 'All Subjects',
    description: 'Result oriented coaching institute in Kota',
    language: 'Hindi/English',
    examFocus: ['JEE Main', 'JEE Advanced', 'NEET'],
    verified: true
  },

  // New Popular JEE Channels
  {
    id: 'UCQTp_TOzxbWp-eKnzXauTiw',
    name: 'PW English Medium',
    handle: '@PWEnglishMedium',
    category: 'JEE Preparation',
    subcategory: 'All Subjects',
    description: 'Physics Wallah English content for JEE/NEET',
    language: 'English',
    examFocus: ['JEE Main', 'JEE Advanced', 'NEET'],
    verified: true
  },
  {
    id: 'UCZ6b4gp8NjjvCo8A6GxTqhg',
    name: 'Apni Kaksha',
    handle: '@ApniKaksha',
    category: 'JEE Preparation',
    subcategory: 'All Subjects',
    description: 'Free quality education for JEE and NEET',
    language: 'Hindi',
    examFocus: ['JEE Main', 'JEE Advanced', 'NEET'],
    verified: true
  },
  {
    id: 'UCqITVnSrsYgIGkDJoEZ6yoQ',
    name: 'JEE Wallah',
    handle: '@JEEWallah',
    category: 'JEE Preparation',
    subcategory: 'All Subjects',
    description: 'Dedicated JEE preparation channel by Physics Wallah',
    language: 'Hindi',
    examFocus: ['JEE Main', 'JEE Advanced'],
    verified: true
  },
  {
    id: 'UC_VkOr4GE8uowW8I7d_NjcQ',
    name: 'Pankaj Sir Chemistry',
    handle: '@PankajSirChemistry',
    category: 'JEE Preparation',
    subcategory: 'Chemistry',
    description: 'Chemistry for JEE by Pankaj Singh',
    language: 'Hindi',
    examFocus: ['JEE Main', 'JEE Advanced'],
    verified: true
  },
  {
    id: 'UCgNGHNhPn8cO5xr_jm2Y3vw',
    name: 'Vikas Gupta [IITB]',
    handle: '@vikasgupta1',
    category: 'JEE Preparation',
    subcategory: 'Mathematics',
    description: 'Mathematics for JEE by IIT Bombay graduate',
    language: 'Hindi',
    examFocus: ['JEE Main', 'JEE Advanced'],
    verified: true
  },

  // NEET Preparation Channels
  {
    id: 'UC1J2R7bwc2DPvTXDxSvAGaA', // BYJU'S
    name: 'BYJU\'S',
    handle: '@byjus',
    category: 'NEET Preparation',
    subcategory: 'All Subjects',
    description: 'Complete NEET and K-12 preparation',
    language: 'Hindi/English',
    examFocus: ['NEET', 'CBSE', 'State Boards'],
    verified: true
  },
  {
    id: 'UCMVFnLtYIz3bRPOC8yrWqYg', // Dr. Najeeb Lectures
    name: 'Dr. Najeeb Lectures',
    handle: '@DrNajeebLectures',
    category: 'Medical Education',
    subcategory: 'Biology',
    description: 'World\'s most popular medical lectures',
    language: 'English',
    examFocus: ['NEET', 'AIIMS', 'Medical Entrance'],
    verified: true
  },
  {
    id: 'UCcl4k_ZnFg7-PNWZ_p-qeMg',
    name: 'Dr. Anand Mani',
    handle: '@dr.anandmani',
    category: 'NEET Preparation',
    subcategory: 'Biology',
    description: 'Biology for NEET',
    language: 'English',
    examFocus: ['NEET'],
    verified: true
  },
  {
    id: 'UC4BjX3BqigeWAOp0kLkKSIA',
    name: 'NEETprep Course: NCERT Based NEET Preparation',
    handle: '@neetprep',
    category: 'NEET Preparation',
    subcategory: 'All Subjects',
    description: 'NCERT based NEET preparation',
    language: 'English',
    examFocus: ['NEET'],
    verified: true
  },

  // New Popular NEET Channels
  {
    id: 'UCGCikHPiCF-GQDB-RJPJ8zw',
    name: 'NEET Wallah',
    handle: '@NEETWallah',
    category: 'NEET Preparation',
    subcategory: 'All Subjects',
    description: 'Dedicated NEET preparation by Physics Wallah',
    language: 'Hindi',
    examFocus: ['NEET'],
    verified: true,
    subscriberCount: '2M+'
  },
  {
    id: 'UC6R8aEbDpBgRbPo7k2KvYlg',
    name: 'Biology by Dr. Ali',
    handle: '@biologydrali',
    category: 'NEET Preparation',
    subcategory: 'Biology',
    description: 'Comprehensive Biology for NEET by Dr. Ali',
    language: 'Hindi/English',
    examFocus: ['NEET'],
    verified: true
  },
  {
    id: 'UCCMq8g2zNgNyFjONd4w3VUg',
    name: 'Shomu\'s Biology',
    handle: '@shomusbiologyofficial',
    category: 'Biology',
    subcategory: 'All Biology Topics',
    description: 'Complete biology concepts for students',
    language: 'English',
    examFocus: ['NEET', 'CBSE', 'General Biology'],
    verified: true
  },

  // CBSE and School Education
  {
    id: 'UCu_fMUm8UUYlptGVrcddFpA', // ExamFear Education
    name: 'ExamFear Education',
    handle: '@ExamFearEducation',
    category: 'CBSE',
    subcategory: 'All Subjects',
    description: 'CBSE curriculum for classes 6-12',
    language: 'Hindi/English',
    examFocus: ['CBSE', 'State Boards'],
    verified: true
  },
  {
    id: 'UCrMO8XOr57wwv5Dl1WV6REA', // Meritnation
    name: 'Meritnation',
    handle: '@Meritnation',
    category: 'CBSE',
    subcategory: 'All Subjects',
    description: 'Comprehensive learning for CBSE students',
    language: 'Hindi/English',
    examFocus: ['CBSE', 'ICSE'],
    verified: true
  },
  {
    id: 'UCqzUPfYABgFT0_YWjn-SJrQ', // Toppr
    name: 'Toppr',
    handle: '@Toppr',
    category: 'CBSE',
    subcategory: 'All Subjects',
    description: 'Adaptive learning platform for students',
    language: 'Hindi/English',
    examFocus: ['CBSE', 'ICSE', 'JEE', 'NEET'],
    verified: true
  },
  {
    id: 'UC3HS6gQ79jjn4xHxogw0HiA',
    name: 'Magnet Brains',
    handle: '@magnetbrainseducation',
    category: 'CBSE',
    subcategory: 'All Subjects',
    description: 'Free online school courses for K-12',
    language: 'Hindi/English',
    examFocus: ['CBSE', 'State Boards'],
    verified: true
  },
  {
    id: 'UCkwzl6q5Ev11lwLTO11roXw',
    name: 'Bodhaguru',
    handle: '@Bodhaguru',
    category: 'General Education',
    subcategory: 'Science and Math',
    description: 'Animated videos for K-10 Science and Math',
    language: 'English/Hindi',
    examFocus: ['CBSE', 'General Learning'],
    verified: true
  },
  {
    id: 'UCTql2Ej61edWLjphCf6nbzw',
    name: 'EduMantra- Sanjiv Pandey',
    handle: '@edumantra007',
    category: 'CBSE',
    subcategory: 'All Subjects',
    description: 'Classes for Class 9-10',
    language: 'Hindi',
    examFocus: ['CBSE'],
    verified: true
  },
  {
    id: 'UC7Y9ZsacCMna74LgYeVbDAQ',
    name: 'Unacademy Class 6',
    handle: '@UnacademyClass6',
    category: 'CBSE',
    subcategory: 'All Subjects',
    description: 'CBSE and NCERT solutions for Class 6',
    language: 'English',
    examFocus: ['CBSE'],
    verified: true
  },

  // New Popular CBSE Channels
  {
    id: 'UCKgha4ESzVLrVb7M9tgLr7w',
    name: 'PW Foundation',
    handle: '@PWFoundation',
    category: 'CBSE',
    subcategory: 'All Subjects',
    description: 'Foundation courses for Classes 6-10 by Physics Wallah',
    language: 'Hindi',
    examFocus: ['CBSE'],
    verified: true
  },
  {
    id: 'UCKxC7mBipXXqrPy2v7NudKg',
    name: 'Class 10 Wallah',
    handle: '@Class10Wallah',
    category: 'CBSE',
    subcategory: 'All Subjects',
    description: 'Complete Class 10 preparation',
    language: 'Hindi',
    examFocus: ['CBSE Class 10'],
    verified: true
  },
  {
    id: 'UCj6D3RHNFbayktCbww2QOBQ',
    name: 'Class 9 Wallah',
    handle: '@Class9Wallah',
    category: 'CBSE',
    subcategory: 'All Subjects',
    description: 'Complete Class 9 preparation',
    language: 'Hindi',
    examFocus: ['CBSE Class 9'],
    verified: true
  },
  {
    id: 'UCMnJkTQmW0lZN3M6y8kCsJQ',
    name: 'Dear Sir',
    handle: '@DearSir',
    category: 'CBSE',
    subcategory: 'Mathematics',
    description: 'Mathematics for Classes 9-12',
    language: 'Hindi',
    examFocus: ['CBSE'],
    verified: true
  },
  {
    id: 'UCk-y5zBurkTUBJSADL7Wncg',
    name: 'Simple Study Notes',
    handle: '@SimpleStudyNotes',
    category: 'CBSE',
    subcategory: 'All Subjects',
    description: 'Easy explanations for CBSE students',
    language: 'Hindi',
    examFocus: ['CBSE'],
    verified: true
  },

  // International/General Educational Channels
  {
    id: 'UCS4aHmggTfFrpkPcWSaBN9g', // Khan Academy
    name: 'Khan Academy',
    handle: '@khanacademy',
    category: 'General Education',
    subcategory: 'All Subjects',
    description: 'World-class education for anyone, anywhere',
    language: 'English',
    examFocus: ['SAT', 'AP', 'General Learning'],
    verified: true
  },
  {
    id: 'UCyo8hR-T-bqkJMqH8EQKK8A', // Khan Academy Hindi
    name: 'Khan Academy Hindi',
    handle: '@khanacademyhindi',
    category: 'General Education',
    subcategory: 'All Subjects',
    description: 'Khan Academy content in Hindi',
    language: 'Hindi',
    examFocus: ['General Learning', 'Competitive Exams'],
    verified: true
  },
  {
    id: 'UCYO_jab_esuFRV4b17AJtAw', // 3Blue1Brown
    name: '3Blue1Brown',
    handle: '@3Blue1Brown',
    category: 'Mathematics',
    subcategory: 'Advanced Math',
    description: 'Mathematics through beautiful visualizations',
    language: 'English',
    examFocus: ['Advanced Mathematics', 'Olympiad'],
    verified: true
  },
  {
    id: 'UCoxcjq-8xIDTYp3uz647V5A', // Numberphile
    name: 'Numberphile',
    handle: '@numberphile',
    category: 'Mathematics',
    subcategory: 'Pure Mathematics',
    description: 'Mathematics made interesting and accessible',
    language: 'English',
    examFocus: ['Mathematical Concepts', 'Olympiad'],
    verified: true
  },
  {
    id: 'UC1_uAIS3r8Vu6JjXWvastJg', // Mathologer
    name: 'Mathologer',
    handle: '@Mathologer',
    category: 'Mathematics',
    subcategory: 'Mathematical Proofs',
    description: 'Beautiful mathematical concepts and proofs',
    language: 'English',
    examFocus: ['Advanced Mathematics', 'Mathematical Reasoning'],
    verified: true
  },
  {
    id: 'UCAuUUnT6oDeKwE6v1NGQxug', // The Organic Chemistry Tutor
    name: 'The Organic Chemistry Tutor',
    handle: '@organicchemistrytutor',
    category: 'Chemistry',
    subcategory: 'Organic Chemistry',
    description: 'Comprehensive chemistry and math tutorials',
    language: 'English',
    examFocus: ['JEE Chemistry', 'AP Chemistry', 'General Chemistry'],
    verified: true
  },
  {
    id: 'UCX6b17PVsYBQ0ip5gyeme-Q', // CrashCourse
    name: 'CrashCourse',
    handle: '@crashcourse',
    category: 'General Education',
    subcategory: 'Multiple Subjects',
    description: 'Educational videos on diverse topics',
    language: 'English',
    examFocus: ['AP Courses', 'General Knowledge'],
    verified: true
  },
  {
    id: 'UCH4BNI0-FOK2dMXoFtViWHw', // SciShow
    name: 'SciShow',
    handle: '@SciShow',
    category: 'Science',
    subcategory: 'General Science',
    description: 'Science news and educational content',
    language: 'English',
    examFocus: ['Science Concepts', 'General Knowledge'],
    verified: true
  },

  // UPSC and Civil Services
  {
    id: 'UC-CSyyi47VX1lD9zyeABW3w', // Study IQ
    name: 'Study IQ',
    handle: '@StudyIQ',
    category: 'Competitive Exams',
    subcategory: 'Current Affairs',
    description: 'Competitive exam preparation and current affairs',
    language: 'Hindi/English',
    examFocus: ['UPSC', 'SSC', 'Banking', 'Railway'],
    verified: true
  },
  {
    id: 'UCGbTcxjlPmPfD6qV7DRH8eQ', // Examrace
    name: 'Examrace',
    handle: '@Examrace',
    category: 'Competitive Exams',
    subcategory: 'Multiple Exams',
    description: 'Preparation for various competitive examinations',
    language: 'Hindi/English',
    examFocus: ['UPSC', 'Banking', 'SSC', 'JEE', 'NEET'],
    verified: true
  },

  // New UPSC Channels
  {
    id: 'UCyj4wXVpJwOy-mVD_7rTBsg',
    name: 'UPSC Wallah',
    handle: '@UPSCWallah',
    category: 'UPSC',
    subcategory: 'All Subjects',
    description: 'Complete UPSC preparation by Physics Wallah',
    language: 'Hindi/English',
    examFocus: ['UPSC'],
    verified: true
  },
  {
    id: 'UCKbsj7zHD3mEYaLRyTmjJqg',
    name: 'Drishti IAS',
    handle: '@DrishtiIAS',
    category: 'UPSC',
    subcategory: 'All Subjects',
    description: 'Premier UPSC coaching institute',
    language: 'Hindi/English',
    examFocus: ['UPSC'],
    verified: true
  },
  {
    id: 'UCWXZFSiHc8V3LH2NMY4s0Wg',
    name: 'Vision IAS',
    handle: '@VisionIAS',
    category: 'UPSC',
    subcategory: 'All Subjects',
    description: 'Leading UPSC coaching institute',
    language: 'Hindi/English',
    examFocus: ['UPSC'],
    verified: true
  },

  // Banking and SSC
  {
    id: 'UCSlrQKKeDsEv-fmMgIkU8kQ',
    name: 'Banking Wallah',
    handle: '@BankingWallah',
    category: 'Banking Exams',
    subcategory: 'All Subjects',
    description: 'Banking exam preparation by Physics Wallah',
    language: 'Hindi',
    examFocus: ['Banking', 'SSC'],
    verified: true
  },
  {
    id: 'UCkOKjE5ZwCe47KKHOAKyG0A',
    name: 'SSC Wallah',
    handle: '@SSCWallah',
    category: 'SSC',
    subcategory: 'All Subjects',
    description: 'SSC exam preparation by Physics Wallah',
    language: 'Hindi',
    examFocus: ['SSC'],
    verified: true
  },
  {
    id: 'UCbMKAaVf2-3VTubcAhgwjJA',
    name: 'Adda247',
    handle: '@Adda247',
    category: 'Banking Exams',
    subcategory: 'All Subjects',
    description: 'Banking, SSC, and government exam preparation',
    language: 'Hindi/English',
    examFocus: ['Banking', 'SSC', 'Railway', 'Insurance'],
    verified: true
  },

  // UGEE Preparation Channels
  {
    id: 'UCqMU-4P1lf014X_yJF20pmg',
    name: 'IIITprep UGEE IIIT Hyderabad',
    handle: '@iiitprep',
    category: 'UGEE Preparation',
    subcategory: 'All Subjects',
    description: 'Preparation Guide for UGEE, Study Material, Online Mock Tests',
    language: 'English',
    examFocus: ['UGEE'],
    verified: true
  },

  // Commerce Channels
  {
    id: 'UC_nYNWmHSlBSAEVEaS0OFpg',
    name: 'CA Parag Gupta',
    handle: '@caparaggupta',
    category: 'Commerce',
    subcategory: 'Accounts and Economics',
    description: 'Accounts and Economics for Class 11-12 and CA',
    language: 'Hindi/English',
    examFocus: ['CBSE', 'CA Foundation'],
    verified: true
  },
  {
    id: 'UCxj30E1j1SsLU-M86PHbO5g',
    name: 'Sunil Panda-The Educator',
    handle: '@sunilpandaofficial',
    category: 'Commerce',
    subcategory: 'All Subjects',
    description: 'Commerce Education for Class 11-12 and B.Com',
    language: 'Hindi',
    examFocus: ['CBSE'],
    verified: true
  },
  {
    id: 'UC4sfE23vp1PaO740hhhqpig',
    name: 'Vedantu Commerce',
    handle: '@VedantuCommerce',
    category: 'Commerce',
    subcategory: 'All Subjects',
    description: 'Commerce for Class 11 and 12',
    language: 'English',
    examFocus: ['CBSE'],
    verified: true
  },

  // New Commerce Channels
  {
    id: 'UCmYuUgfR_IJ8LJuWKCjHJgA',
    name: 'Commerce Wallah',
    handle: '@CommerceWallah',
    category: 'Commerce',
    subcategory: 'All Subjects',
    description: 'Commerce preparation by Physics Wallah',
    language: 'Hindi',
    examFocus: ['CBSE', 'CA Foundation'],
    verified: true
  },
  {
    id: 'UCpuSN4f6s7KW12jQJHKTYKQ',
    name: 'CA Rachana Phadke Ranade',
    handle: '@CARachanaRanade',
    category: 'Commerce',
    subcategory: 'Finance and CA',
    description: 'CA, Finance, and Investment education',
    language: 'Hindi/English',
    examFocus: ['CA', 'Financial Literacy'],
    verified: true
  },

  // English Learning and Communication
  {
    id: 'UCmYEZBJiPqU5fEd0D5s_iXA',
    name: 'English Wallah',
    handle: '@EnglishWallah',
    category: 'English Learning',
    subcategory: 'Communication Skills',
    description: 'English language learning by Physics Wallah',
    language: 'Hindi/English',
    examFocus: ['Communication Skills', 'Competitive Exams'],
    verified: true
  },
  {
    id: 'UCggHC_WCYKthIIzZkKV9qnA',
    name: 'Speak English With Vanessa',
    handle: '@SpeakEnglishWithVanessa',
    category: 'English Learning',
    subcategory: 'Spoken English',
    description: 'Advanced English communication skills',
    language: 'English',
    examFocus: ['English Proficiency', 'IELTS', 'TOEFL'],
    verified: true
  },
  {
    id: 'UCdBK94X6yqLV-sxy1Hi5o6Q',
    name: 'Spoken English Guru',
    handle: '@spokenenglishguru',
    category: 'English Learning',
    subcategory: 'Spoken English',
    description: 'Learn English through Hindi',
    language: 'Hindi/English',
    examFocus: ['Communication Skills'],
    verified: true
  },

  // Programming and Computer Science
  {
    id: 'UCBwmMxybNva6P_5VmxjzwqA',
    name: 'CodeWithHarry',
    handle: '@CodeWithHarry',
    category: 'Programming',
    subcategory: 'Web Development',
    description: 'Programming tutorials in Hindi',
    language: 'Hindi/English',
    examFocus: ['Programming', 'Web Development'],
    verified: true,
    subscriberCount: '4M+'
  },
  {
    id: 'UC59K-uG2A5ogwIrHw4bmlEg',
    name: 'Apna College',
    handle: '@ApnaCollegeOfficial',
    category: 'Programming',
    subcategory: 'Data Structures and Algorithms',
    description: 'Programming and placement preparation',
    language: 'Hindi',
    examFocus: ['Programming', 'Placement Preparation'],
    verified: true,
    subscriberCount: '5M+'
  },
  {
    id: 'UCgFmjA9w3JqDOlJ7hCWKJlw',
    name: 'Gate Smashers',
    handle: '@GateSmashers',
    category: 'Computer Science',
    subcategory: 'GATE Preparation',
    description: 'Computer Science for GATE and university exams',
    language: 'Hindi/English',
    examFocus: ['GATE', 'Computer Science'],
    verified: true
  },
  {
    id: 'UCJihyK0A38SZ6SdJirEdIOw',
    name: 'CodeHelp - by Babbar',
    handle: '@CodeHelp',
    category: 'Programming',
    subcategory: 'Data Structures and Algorithms',
    description: 'DSA and programming by Love Babbar',
    language: 'Hindi',
    examFocus: ['Programming', 'Placement Preparation'],
    verified: true
  }
];

// Enhanced Search and filter functions
export const searchIndianChannels = (query: string): Channel[] => {
  if (!query || query.length < 2) return [];
  
  const normalizedQuery = query.toLowerCase().trim();
  
  return INDIAN_STUDY_CHANNELS.filter(channel => {
    const nameMatch = channel.name.toLowerCase().includes(normalizedQuery);
    const categoryMatch = channel.category.toLowerCase().includes(normalizedQuery);
    const subcategoryMatch = channel.subcategory.toLowerCase().includes(normalizedQuery);
    const descriptionMatch = channel.description.toLowerCase().includes(normalizedQuery);
    const examMatch = channel.examFocus.some(exam => 
      exam.toLowerCase().includes(normalizedQuery)
    );
    const languageMatch = channel.language.toLowerCase().includes(normalizedQuery);
    const handleMatch = channel.handle.toLowerCase().includes(normalizedQuery);
    
    return nameMatch || categoryMatch || subcategoryMatch || descriptionMatch || examMatch || languageMatch || handleMatch;
  }).slice(0, 12);
};

export const getChannelsByExam = (exam: string): Channel[] => {
  return INDIAN_STUDY_CHANNELS.filter(channel => 
    channel.examFocus.some(focus => 
      focus.toLowerCase().includes(exam.toLowerCase())
    )
  );
};

export const getChannelsByCategory = (category: string): Channel[] => {
  return INDIAN_STUDY_CHANNELS.filter(channel => 
    channel.category.toLowerCase() === category.toLowerCase()
  );
};

export const getChannelsByLanguage = (language: string): Channel[] => {
  return INDIAN_STUDY_CHANNELS.filter(channel => 
    channel.language.toLowerCase().includes(language.toLowerCase())
  );
};

export const getPopularChannels = (): Channel[] => {
  return INDIAN_STUDY_CHANNELS.filter(channel => 
    channel.subscriberCount && channel.subscriberCount !== undefined
  ).sort((a, b) => {
    // Sort by subscriber count (rough sorting)
    const aCount = a.subscriberCount || '0';
    const bCount = b.subscriberCount || '0';
    return bCount.localeCompare(aCount);
  });
};

export const getChannelsBySubcategory = (subcategory: string): Channel[] => {
  return INDIAN_STUDY_CHANNELS.filter(channel => 
    channel.subcategory.toLowerCase().includes(subcategory.toLowerCase())
  );
};

export const getVerifiedChannels = (): Channel[] => {
  return INDIAN_STUDY_CHANNELS.filter(channel => channel.verified);
};

export const getAllExams = (): string[] => {
  const exams = new Set<string>();
  INDIAN_STUDY_CHANNELS.forEach(channel => {
    channel.examFocus.forEach(exam => exams.add(exam));
  });
  return Array.from(exams).sort();
};

export const getAllCategories = (): string[] => {
  const categories = [...new Set(INDIAN_STUDY_CHANNELS.map(channel => channel.category))];
  return categories.sort();
};

export const getAllSubcategories = (): string[] => {
  const subcategories = [...new Set(INDIAN_STUDY_CHANNELS.map(channel => channel.subcategory))];
  return subcategories.sort();
};

export const getAllLanguages = (): string[] => {
  const languages = new Set<string>();
  INDIAN_STUDY_CHANNELS.forEach(channel => {
    channel.language.split('/').forEach(lang => languages.add(lang.trim()));
  });
  return Array.from(languages).sort();
};

export const getChannelById = (channelId: string): Channel | undefined => {
  return INDIAN_STUDY_CHANNELS.find(channel => channel.id === channelId);
};

export const getRandomChannels = (count: number = 5): Channel[] => {
  const shuffled = [...INDIAN_STUDY_CHANNELS].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

export const getChannelStats = () => {
  return {
    totalChannels: INDIAN_STUDY_CHANNELS.length,
    categoriesCount: getAllCategories().length,
    examsCount: getAllExams().length,
    languagesCount: getAllLanguages().length,
    verifiedChannels: getVerifiedChannels().length
  };
};

export const isWhitelistedChannel = (channelId: string): boolean => {
  return INDIAN_STUDY_CHANNELS.some(channel => channel.id === channelId);
};

export const getChannelInfo = (channelId: string): Channel | null => {
  return INDIAN_STUDY_CHANNELS.find(channel => channel.id === channelId) || null;
};