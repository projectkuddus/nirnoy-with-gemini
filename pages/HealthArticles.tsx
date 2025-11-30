import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import PageHeader from '../components/PageHeader';

const HEALTH_ARTICLES = [
  {
    id: 'diabetes-management',
    category: 'Diabetes',
    categoryBn: 'ডায়াবেটিস',
    title: 'Complete Guide to Diabetes Management in Bangladesh',
    titleBn: 'বাংলাদেশে ডায়াবেটিস ব্যবস্থাপনার সম্পূর্ণ গাইড',
    excerpt: 'Learn how to manage diabetes effectively with Nirnoy expert doctors.',
    excerptBn: 'নির্ণয়ের বিশেষজ্ঞ ডাক্তারদের সাথে ডায়াবেটিস কার্যকরভাবে নিয়ন্ত্রণ করুন।',
    image: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=800',
    readTime: '5 min',
    specialty: 'endocrinology',
  },
  {
    id: 'heart-health-tips',
    category: 'Cardiology',
    categoryBn: 'হৃদরোগ',
    title: 'Heart Health Tips: Prevent Heart Disease with Nirnoy Cardiologists',
    titleBn: 'হৃদরোগ প্রতিরোধ: নির্ণয়ের হৃদরোগ বিশেষজ্ঞদের পরামর্শ',
    excerpt: 'Expert advice from Nirnoy cardiologists on maintaining heart health.',
    excerptBn: 'নির্ণয়ের হৃদরোগ বিশেষজ্ঞদের কাছ থেকে হৃদয় সুস্থ রাখার পরামর্শ।',
    image: 'https://images.unsplash.com/photo-1628348070889-cb656235b4eb?w=800',
    readTime: '4 min',
    specialty: 'cardiology',
  },
  {
    id: 'pregnancy-care',
    category: 'Gynecology',
    categoryBn: 'স্ত্রীরোগ',
    title: 'Pregnancy Care Guide: Expert Advice from Nirnoy Gynecologists',
    titleBn: 'গর্ভাবস্থার যত্ন: নির্ণয়ের স্ত্রীরোগ বিশেষজ্ঞদের পরামর্শ',
    excerpt: 'Comprehensive pregnancy care tips from Nirnoy gynecologists.',
    excerptBn: 'নির্ণয়ের অভিজ্ঞ স্ত্রীরোগ বিশেষজ্ঞদের কাছ থেকে সম্পূর্ণ গর্ভাবস্থার যত্ন।',
    image: 'https://images.unsplash.com/photo-1493894473891-10fc1e5dbd22?w=800',
    readTime: '6 min',
    specialty: 'gynecology',
  },
  {
    id: 'child-vaccination',
    category: 'Pediatrics',
    categoryBn: 'শিশুরোগ',
    title: 'Child Vaccination Schedule in Bangladesh: Nirnoy Pediatrician Guide',
    titleBn: 'বাংলাদেশে শিশু টিকাদান সূচি: নির্ণয় শিশু বিশেষজ্ঞ গাইড',
    excerpt: 'Complete vaccination schedule for children in Bangladesh.',
    excerptBn: 'বাংলাদেশে শিশুদের জন্য সম্পূর্ণ টিকাদান সূচি।',
    image: 'https://images.unsplash.com/photo-1632053002928-1919605ee6f7?w=800',
    readTime: '5 min',
    specialty: 'pediatrics',
  },
  {
    id: 'mental-health-awareness',
    category: 'Psychiatry',
    categoryBn: 'মানসিক স্বাস্থ্য',
    title: 'Mental Health Awareness: Talk to Nirnoy Psychiatrists',
    titleBn: 'মানসিক স্বাস্থ্য সচেতনতা: নির্ণয়ের মনোরোগ বিশেষজ্ঞদের সাথে কথা বলুন',
    excerpt: 'Breaking the stigma around mental health in Bangladesh.',
    excerptBn: 'বাংলাদেশে মানসিক স্বাস্থ্যের কলঙ্ক ভাঙা।',
    image: 'https://images.unsplash.com/photo-1544027993-37dbfe43562a?w=800',
    readTime: '4 min',
    specialty: 'psychiatry',
  },
  {
    id: 'skin-care-tips',
    category: 'Dermatology',
    categoryBn: 'চর্মরোগ',
    title: 'Skin Care Tips for Bangladesh Climate: Nirnoy Dermatologist Advice',
    titleBn: 'বাংলাদেশের আবহাওয়ায় ত্বকের যত্ন: নির্ণয় চর্মরোগ বিশেষজ্ঞ পরামর্শ',
    excerpt: 'Expert skin care advice from Nirnoy dermatologists.',
    excerptBn: 'নির্ণয়ের চর্মরোগ বিশেষজ্ঞদের কাছ থেকে ত্বকের যত্নের পরামর্শ।',
    image: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=800',
    readTime: '4 min',
    specialty: 'dermatology',
  },
];

export const HealthArticles: React.FC = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const isBn = language === 'bn';
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  const categories = ['all', ...new Set(HEALTH_ARTICLES.map(a => a.category))];
  
  const filteredArticles = selectedCategory === 'all' 
    ? HEALTH_ARTICLES 
    : HEALTH_ARTICLES.filter(a => a.category === selectedCategory);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <PageHeader showNav={true} showGetStarted={true} />
      
      <section className="relative pt-28 pb-16 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white overflow-hidden">
        <div className="container mx-auto px-4 relative z-10 text-center">
          <h1 className="text-4xl md:text-5xl font-black mb-4">
            {isBn ? 'নির্ণয় স্বাস্থ্য গাইড' : 'Nirnoy Health Guide'}
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            {isBn ? 'বিশেষজ্ঞ ডাক্তারদের কাছ থেকে স্বাস্থ্য টিপস ও পরামর্শ' : 'Health tips and advice from expert doctors'}
          </p>
        </div>
      </section>

      <section className="py-8 bg-white border-b border-slate-100 sticky top-0 z-20">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap gap-2 justify-center">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
                  selectedCategory === cat ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat === 'all' ? (isBn ? 'সব' : 'All') : cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredArticles.map(article => (
            <article 
              key={article.id}
              className="bg-white rounded-2xl overflow-hidden border border-slate-100 hover:shadow-xl transition group cursor-pointer"
              onClick={() => navigate(`/search?specialty=${article.specialty}`)}
            >
              <div className="aspect-video overflow-hidden">
                <img src={article.image} alt={isBn ? article.titleBn : article.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
              </div>
              <div className="p-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-semibold">
                    {isBn ? article.categoryBn : article.category}
                  </span>
                  <span className="text-slate-400 text-xs">{article.readTime}</span>
                </div>
                <h2 className="text-lg font-bold text-slate-800 mb-2 group-hover:text-blue-600 transition line-clamp-2">
                  {isBn ? article.titleBn : article.title}
                </h2>
                <p className="text-slate-500 text-sm line-clamp-2">
                  {isBn ? article.excerptBn : article.excerpt}
                </p>
                <button className="mt-4 text-blue-600 font-semibold text-sm hover:text-blue-700 transition">
                  {isBn ? 'ডাক্তার খুঁজুন →' : 'Find Doctors →'}
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="py-16 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-black mb-4">
            {isBn ? 'বিশেষজ্ঞ ডাক্তারের পরামর্শ নিন' : 'Get Expert Doctor Advice'}
          </h2>
          <p className="text-blue-100 mb-8 max-w-xl mx-auto">
            {isBn ? 'নির্ণয়ে ৫০০+ বিশেষজ্ঞ ডাক্তারের সাথে অ্যাপয়েন্টমেন্ট নিন' : 'Book appointments with 500+ specialist doctors on Nirnoy'}
          </p>
          <button onClick={() => navigate('/search')} className="px-8 py-4 bg-white text-blue-600 font-bold rounded-xl hover:bg-blue-50 transition shadow-lg">
            {isBn ? 'ডাক্তার খুঁজুন' : 'Find a Doctor'}
          </button>
        </div>
      </section>

      <footer className="bg-slate-900 text-slate-400 py-8 text-center text-sm">
        <p>&copy; 2025 Nirnoy Health | নির্ণয় হেলথ</p>
        <p className="mt-1">nirnoy.ai - Bangladesh's #1 AI Healthcare Platform</p>
      </footer>
    </div>
  );
};

export default HealthArticles;
