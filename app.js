// العناصر الرئيسية في الصفحة
const surahsList = document.getElementById('surahsList');
const surahContent = document.getElementById('surahContent');
const versesContainer = document.getElementById('versesContainer');
const surahName = document.getElementById('surahName');
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const closeSettings = document.getElementById('closeSettings');
const playBtn = document.getElementById('playBtn');
const stopBtn = document.getElementById('stopBtn');
const prevVerseBtn = document.getElementById('prevVerse');
const nextVerseBtn = document.getElementById('nextVerse');
const playPause = document.getElementById('playPause');
const progressBar = document.getElementById('progressBar');
const toggleSurahsBtn = document.getElementById('toggleSurahsBtn');
const reciterSelect = document.getElementById('reciter');
const fontSizeSelect = document.getElementById('fontSize');
const playbackSpeedSelect = document.getElementById('playbackSpeed');
const volumeSlider = document.getElementById('volume');
const volumeValue = document.getElementById('volumeValue');
const tafseerModal = document.getElementById('tafseerModal');
const tafseerText = document.getElementById('tafseerText');
const closeTafseer = document.getElementById('closeTafseer');
const darkModeBtn = document.getElementById('darkModeBtn');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const searchResults = document.getElementById('searchResults');

// متغيرات التطبيق
let currentSurah = null;
let currentVerseIndex = 0;
let currentSurahIndex = 0;
let audio = null;
let slowAudio = null;
let isPlaying = false;
let surahs = [];
let autoPlayEnabled = false;
let currentReciter = 'ar.alafasy';
let currentWord = null;
let currentAudio = null;

// معرفات القراء
const RECITERS = {
    'alafasy': 'ar.alafasy',
    'minshawi': 'ar.minshawi',
    'husary': 'ar.husary',
    'abdulbasit': 'ar.abdulbasit',
    'muaiqly': 'ar.maiqli',
    'sudais': 'ar.abdurrahmaansudais',
    'shatri': 'ar.shaatree',
    'rifai': 'ar.hanirifai',
    'shahriar': 'ar.parhizgar',
    'hudhaify': 'ar.hudhaify',
    'shuraym': 'ar.shuraym',
    'basfar': 'ar.basfar',
    'ajamy': 'ar.ajamy',
    'ghamdi': 'ar.ghamdi',
    'jibreel': 'ar.jibreel',
    'jazaery': 'ar.jazaery'
};

// تحميل السور عند بدء التطبيق
async function loadSurahs() {
    try {
        const response = await fetch('https://api.alquran.cloud/v1/surah');
        const data = await response.json();
        if (data.data) {
            surahs = data.data;
            displaySurahs();
            
            // تحميل آخر موقع محفوظ
            const savedPosition = localStorage.getItem('quranPosition');
            if (savedPosition) {
                const position = JSON.parse(savedPosition);
                currentSurahIndex = position.surahNumber - 1;
                currentVerseIndex = position.verseIndex;
                await loadSurah(position.surahNumber, position.verseIndex);
            } else {
                currentSurahIndex = 0;
                currentVerseIndex = 0;
                await loadSurah(1, 0); // تحميل سورة الفاتحة افتراضياً
            }
        }
    } catch (error) {
        console.error('Error loading surahs:', error);
        surahsList.innerHTML = '<div class="error">حدث خطأ في تحميل السور. يرجى المحاولة مرة أخرى.</div>';
    }
}

// عرض السور في القائمة
function displaySurahs() {
    surahsList.innerHTML = '';
    surahs.forEach(surah => {
        const surahItem = document.createElement('div');
        surahItem.className = 'surah-item';
        surahItem.textContent = `${surah.number}. ${surah.name}`;
        surahItem.addEventListener('click', () => loadSurah(surah.number));
        surahsList.appendChild(surahItem);
    });
}

// تحميل سورة محددة
async function loadSurah(surahNumber, savedVerseIndex = 0) {
    try {
        const response = await fetch(`https://api.alquran.cloud/v1/surah/${surahNumber}/${currentReciter}`);
        const data = await response.json();
        
        if (data.data) {
            currentSurah = data.data;
            currentSurahIndex = surahNumber - 1;
            currentVerseIndex = savedVerseIndex;
            displaySurah();
            surahsList.classList.remove('active');
            
            // حفظ الموقع الحالي
            saveCurrentPosition();
            
            // إذا كان هناك صوت يعمل، قم بتحديثه
            if (isPlaying) {
                playCurrentVerse();
            }
        }
    } catch (error) {
        console.error('Error loading surah:', error);
        versesContainer.innerHTML = '<div class="error">حدث خطأ في تحميل السورة. يرجى المحاولة مرة أخرى.</div>';
    }
}

// تحديث دالة عرض السورة
async function displaySurah() {
    if (!currentSurah) return;
    
    surahName.textContent = currentSurah.name;
    versesContainer.innerHTML = '';
    
    // إنشاء عنصر الآية
    const verseElement = document.createElement('div');
    verseElement.className = 'verse current-verse';
    
    // إضافة نص الآية
    const verseText = document.createElement('div');
    verseText.className = 'verse-text';
    verseText.innerHTML = currentSurah.ayahs[currentVerseIndex].text;
    
    // تعيين حجم الخط المتوسط
    verseText.style.fontSize = '32px';
    
    // إضافة معلومات الآية
    const verseInfo = document.createElement('div');
    verseInfo.className = 'verse-info';
    verseInfo.innerHTML = `
        <div class="info-item">
            <span class="info-label">السورة:</span>
            <span class="info-value">${currentSurah.name}</span>
        </div>
        <div class="info-item">
            <span class="info-label">رقم الآية:</span>
            <span class="info-value">${currentSurah.ayahs[currentVerseIndex].numberInSurah}</span>
        </div>
        <div class="info-item">
            <span class="info-label">الجزء:</span>
            <span class="info-value">${Math.ceil(currentSurah.ayahs[currentVerseIndex].number / 20)}</span>
        </div>
    `;
    
    // إضافة زر التفسير
    const tafseerButton = document.createElement('button');
    tafseerButton.className = 'tafseer-icon-btn';
    tafseerButton.innerHTML = '<i class="fas fa-question-circle"></i>';
    tafseerButton.title = 'عرض تفسير الآية';
    tafseerButton.addEventListener('click', () => {
        showTafseer(currentSurah.ayahs[currentVerseIndex].number);
    });
    
    // تجميع العناصر
    verseElement.appendChild(tafseerButton);
    verseElement.appendChild(verseText);
    verseElement.appendChild(verseInfo);
    versesContainer.appendChild(verseElement);
    
    // حفظ الموقع الحالي
    saveCurrentPosition();
}

// تشغيل الآية الحالية
async function playCurrentVerse() {
    if (!currentSurah || !currentSurah.ayahs[currentVerseIndex]) return;
    
    stopAllAudio();
    
    const verse = currentSurah.ayahs[currentVerseIndex];
    audio = new Audio(verse.audio);
    
    // تطبيق سرعة التشغيل المحفوظة
    const savedSpeed = localStorage.getItem('playbackSpeed') || '1';
    audio.playbackRate = parseFloat(savedSpeed);
    
    // تطبيق مستوى الصوت المحفوظ
    const savedVolume = localStorage.getItem('volume') || '100';
    audio.volume = parseInt(savedVolume) / 100;
    
    try {
        await audio.play();
        isPlaying = true;
        updatePlayButton();
        
        audio.addEventListener('ended', () => {
            isPlaying = false;
            updatePlayButton();
            if (autoPlayEnabled) {
                goToNextVerse();
            }
        });
        
        displaySurah();
    } catch (error) {
        console.error('Error playing verse:', error);
        isPlaying = false;
        updatePlayButton();
    }
}

// دالة لإيقاف جميع الأصوات
function stopAllAudio() {
    if (audio) {
        audio.pause();
        audio.currentTime = 0;
        audio = null;
    }
    if (slowAudio) {
        slowAudio.pause();
        slowAudio.currentTime = 0;
        slowAudio = null;
    }
    isPlaying = false;
    updatePlayButton();
}

// الانتقال إلى الآية التالية
async function goToNextVerse() {
    if (!currentSurah) return;
    
    if (currentVerseIndex < currentSurah.ayahs.length - 1) {
        currentVerseIndex++;
        displaySurah();
        playCurrentVerse();
    } else if (currentSurahIndex < surahs.length - 1) {
        await loadSurah(currentSurahIndex + 2);
        currentVerseIndex = 0;
        displaySurah();
        playCurrentVerse();
    }
}

// الانتقال إلى الآية السابقة
function goToPreviousVerse() {
    if (!currentSurah) return;
    
    if (currentVerseIndex > 0) {
        currentVerseIndex--;
        displaySurah();
        playCurrentVerse();
    }
}

// تحديث زر التشغيل/الإيقاف
function updatePlayButton() {
    const icon = playPause.querySelector('i');
    icon.className = isPlaying ? 'fas fa-pause' : 'fas fa-play';
}

// إضافة مستمعي الأحداث
toggleSurahsBtn.addEventListener('click', () => {
    surahsList.classList.toggle('active');
});

settingsBtn.addEventListener('click', () => {
    settingsModal.classList.add('active');
});

closeSettings.addEventListener('click', () => {
    settingsModal.classList.remove('active');
    updateSettings();
});

playBtn.addEventListener('click', () => {
    autoPlayEnabled = true;
    playCurrentVerse();
});

stopBtn.addEventListener('click', () => {
    autoPlayEnabled = false;
    stopAllAudio();
});

nextVerseBtn.addEventListener('click', () => {
    autoPlayEnabled = false;
    goToNextVerse();
    updateVersePosition();
});

prevVerseBtn.addEventListener('click', () => {
    autoPlayEnabled = false;
    goToPreviousVerse();
    updateVersePosition();
});

playPause.addEventListener('click', () => {
    if (audio) {
        if (audio.paused) {
            audio.play();
            isPlaying = true;
        } else {
            audio.pause();
            isPlaying = false;
        }
        updatePlayButton();
    } else {
        playCurrentVerse();
    }
});

// تحديث الإعدادات
function updateSettings() {
    // إيقاف الصوت عند فتح الإعدادات
    stopAllAudio();
    
    // تحديث القارئ
    const reciterId = reciterSelect.value;
    currentReciter = RECITERS[reciterId] || 'ar.alafasy';
    localStorage.setItem('reciter', reciterId);
    
    // تحديث سرعة التشغيل
    const playbackSpeed = playbackSpeedSelect.value;
    localStorage.setItem('playbackSpeed', playbackSpeed);
    
    // تحديث مستوى الصوت
    const volume = volumeSlider.value;
    localStorage.setItem('volume', volume);
    if (audio) {
        audio.volume = volume / 100;
    }
    
    // إعادة تحميل السورة مع الحفاظ على الموضع الحالي
    if (currentSurah) {
        loadSurah(currentSurah.number, currentVerseIndex);
    }
}

// حفظ الموقع الحالي
function saveCurrentPosition() {
    if (!currentSurah) return;
    
    const position = {
        surahNumber: currentSurah.number,
        verseIndex: currentVerseIndex,
        reciter: reciterSelect.value,
        timestamp: new Date().getTime()
    };
    
    localStorage.setItem('quranPosition', JSON.stringify(position));
}

// استرجاع آخر موقع والإعدادات
async function loadLastPosition() {
    try {
        // استرجاع الإعدادات
        const savedReciter = localStorage.getItem('reciter') || 'alafasy';
        const savedSpeed = localStorage.getItem('playbackSpeed') || '1';
        const savedVolume = localStorage.getItem('volume') || '100';
        
        // تطبيق القارئ المحفوظ
        if (savedReciter) {
            reciterSelect.value = savedReciter;
            currentReciter = RECITERS[savedReciter];
        }
        
        // تطبيق سرعة التشغيل المحفوظة
        if (savedSpeed) {
            playbackSpeedSelect.value = savedSpeed;
        }
        
        // تطبيق مستوى الصوت المحفوظ
        if (savedVolume) {
            volumeSlider.value = savedVolume;
            volumeValue.textContent = `${savedVolume}%`;
            if (audio) {
                audio.volume = savedVolume / 100;
            }
        }
        
        // استرجاع الموقع المحفوظ
        const savedPosition = localStorage.getItem('quranPosition');
        if (savedPosition) {
            const position = JSON.parse(savedPosition);
            await loadSurah(position.surahNumber, position.verseIndex);
        } else {
            await loadSurah(1, 0); // تحميل سورة الفاتحة افتراضياً
        }
    } catch (error) {
        console.error('Error loading settings:', error);
        await loadSurah(1, 0); // تحميل سورة الفاتحة في حالة حدوث خطأ
    }
}

// تحديث الموقع عند تغيير الآية
function updateVersePosition() {
    if (!currentSurah) return;
    saveCurrentPosition();
}

// إضافة مستمعي الأحداث
document.addEventListener('DOMContentLoaded', () => {
    // مستمعي الأحداث
    reciterSelect.addEventListener('change', updateSettings);
    playbackSpeedSelect.addEventListener('change', updateSettings);
    
    // تحميل الإعدادات المحفوظة
    loadLastPosition();
    initDarkMode();
});

// حفظ الموقع قبل إغلاق الصفحة
window.addEventListener('beforeunload', () => {
    saveCurrentPosition();
});

// تحديث الموقع كل 30 ثانية
setInterval(saveCurrentPosition, 30000);

// دالة مساعدة للحصول على حجم الخط
function getFontSize(size) {
    switch(size) {
        case 'small': return '8vw';
        case 'medium': return '11vw';
        case 'large': return '14vw';
        case 'xlarge': return '17vw';
        default: return '11vw';
    }
}

// بدء التطبيق
loadSurahs();

async function playVerse(verseNumber, speed = 'normal') {
    try {
        // إيقاف أي صوت حالي
        if (currentAudio) {
            stopAudio();
        }

        // جلب رابط الصوت للآية
        const response = await fetch(`https://api.alquran.cloud/v1/ayah/${verseNumber}/ar.alafasy`);
        const data = await response.json();
        
        if (data.code === 200) {
            currentAudio = new Audio(data.data.audio);
            
            // تطبيق مستوى الصوت المحفوظ
            const savedVolume = localStorage.getItem('volume') || '100';
            currentAudio.volume = parseInt(savedVolume) / 100;
            
            // ضبط سرعة التشغيل
            if (speed === 'slow') {
                currentAudio.playbackRate = 0.75;
            } else {
                currentAudio.playbackRate = 1.0;
            }
            
            // تحديث الواجهة
            document.querySelectorAll('.verse').forEach(verse => {
                verse.classList.remove('current-verse');
                if (verse.getAttribute('data-verse') === verseNumber.toString()) {
                    verse.classList.add('current-verse');
                }
            });
            
            await currentAudio.play();
        }
    } catch (error) {
        console.error('Error playing verse:', error);
    }
}

function playWord(wordAudioUrl) {
    try {
        if (currentAudio) {
            stopAudio();
        }
        
        currentAudio = new Audio(wordAudioUrl);
        
        // تطبيق مستوى الصوت المحفوظ
        const savedVolume = localStorage.getItem('volume') || '100';
        currentAudio.volume = parseInt(savedVolume) / 100;
        
        currentAudio.play();
    } catch (error) {
        console.error('Error playing word:', error);
    }
}

function stopAudio() {
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        currentAudio = null;
    }
}

// إضافة مستمع حدث لتغيير مستوى الصوت
volumeSlider.addEventListener('input', (e) => {
    const volume = e.target.value;
    volumeValue.textContent = `${volume}%`;
    if (audio) {
        audio.volume = volume / 100;
    }
    localStorage.setItem('volume', volume);
});

// إغلاق نافذة التفسير
closeTafseer.addEventListener('click', () => {
    tafseerModal.style.display = 'none';
});

// دالة عرض التفسير
async function showTafseer(verseKey) {
    try {
        const response = await fetch(`https://api.alquran.cloud/v1/ayah/${verseKey}/ar.muyassar`);
        const data = await response.json();
        if (data.code === 200 && data.data) {
            const tafseer = data.data.text || 'التفسير غير متوفر';
            tafseerText.innerHTML = tafseer;
            tafseerModal.style.display = 'block';
        } else {
            tafseerText.innerHTML = 'التفسير غير متوفر';
            tafseerModal.style.display = 'block';
        }
    } catch (error) {
        console.error('Error fetching tafseer:', error);
        tafseerText.innerHTML = 'عذراً، حدث خطأ في تحميل التفسير';
        tafseerModal.style.display = 'block';
    }
}

// تحديث دالة عرض الآيات لإضافة زر التفسير
function displayVerses(verses) {
    versesContainer.innerHTML = '';
    verses.forEach((verse, index) => {
        const verseElement = document.createElement('div');
        verseElement.className = 'verse';
        verseElement.innerHTML = `
            <div class="verse-text">${verse.text}</div>
            <div class="verse-controls">
                <button class="verse-btn play-verse">
                    <i class="fas fa-play"></i>
                    تشغيل
                </button>
                <button class="verse-btn tafseer">
                    <i class="fas fa-book"></i>
                    تفسير
                </button>
            </div>
        `;

        const playButton = verseElement.querySelector('.play-verse');
        const tafseerButton = verseElement.querySelector('.verse-btn.tafseer');

        playButton.addEventListener('click', () => {
            playVerse(verse.number);
        });

        tafseerButton.addEventListener('click', () => {
            showTafseer(verse.number);
        });

        versesContainer.appendChild(verseElement);
    });
}

// تحديث دالة تحميل الإعدادات
function loadSettings() {
    const settings = JSON.parse(localStorage.getItem('quranSettings')) || {};
    selectedReciter = settings.reciter || 'ar.alafasy';
    document.getElementById('reciter').value = selectedReciter;
    
    const volume = settings.volume || 100;
    volumeSlider.value = volume;
    volumeValue.textContent = `${volume}%`;
    audio.volume = volume / 100;
}

// تحديث دالة حفظ الإعدادات
function saveSettings() {
    const settings = {
        reciter: selectedReciter,
        volume: volumeSlider.value
    };
    localStorage.setItem('quranSettings', JSON.stringify(settings));
}

// تهيئة الوضع الليلي
function initDarkMode() {
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    if (isDarkMode) {
        document.body.classList.add('dark-mode');
        darkModeBtn.innerHTML = '<i class="fas fa-sun"></i>';
    }
}

// تبديل الوضع الليلي
darkModeBtn.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const isDarkMode = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDarkMode);
    darkModeBtn.innerHTML = isDarkMode ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
});

// وظيفة البحث
async function searchQuran(query) {
    if (!query.trim()) {
        searchResults.classList.remove('active');
        return;
    }

    try {
        const response = await fetch(`https://api.alquran.cloud/v1/search/${encodeURIComponent(query)}/all/ar`);
        const data = await response.json();

        if (data.code === 200 && data.data.matches.length > 0) {
            displaySearchResults(data.data.matches);
        } else {
            searchResults.innerHTML = '<div class="search-result-item">لا توجد نتائج</div>';
        }
        searchResults.classList.add('active');
    } catch (error) {
        console.error('خطأ في البحث:', error);
        searchResults.innerHTML = '<div class="search-result-item">حدث خطأ في البحث</div>';
    }
}

// عرض نتائج البحث
function displaySearchResults(matches) {
    searchResults.innerHTML = matches.slice(0, 10).map(match => `
        <div class="search-result-item" data-surah="${match.surah.number}" data-verse="${match.numberInSurah}">
            <div class="surah-name">${match.surah.name} - الآية ${match.numberInSurah}</div>
            <div class="verse-text">${match.text}</div>
        </div>
    `).join('');

    // إضافة مستمع الأحداث لنتائج البحث
    document.querySelectorAll('.search-result-item').forEach(item => {
        item.addEventListener('click', () => {
            const surahNumber = parseInt(item.dataset.surah);
            const verseNumber = parseInt(item.dataset.verse);
            loadSurah(surahNumber, verseNumber);
            searchResults.classList.remove('active');
            searchInput.value = '';
        });
    });
}

// مستمعات الأحداث للبحث
searchInput.addEventListener('input', (e) => {
    if (e.target.value.length >= 3) {
        searchQuran(e.target.value);
    } else {
        searchResults.classList.remove('active');
    }
});

searchBtn.addEventListener('click', () => {
    if (searchInput.value.length >= 3) {
        searchQuran(searchInput.value);
    }
});

// إخفاء نتائج البحث عند النقر خارجها
document.addEventListener('click', (e) => {
    if (!searchResults.contains(e.target) && !searchInput.contains(e.target)) {
        searchResults.classList.remove('active');
    }
}); 