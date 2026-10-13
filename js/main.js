document.addEventListener('DOMContentLoaded', () => {
    const root = document.documentElement;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    // ---------------------------------------------
    // 0. 테마 관리 (접속할 때마다 무작위 테마, 직접 고르면 세션 동안 유지)
    //    첫 테마는 <head>의 인라인 스크립트가 미리 정해 둠
    // ---------------------------------------------
    const THEMES = {
        liquid:    { name: '리퀴드 글래스',     color: '#eef1f8' },
        aurora:    { name: '오로라 나이트',     color: '#060609' },
        editorial: { name: '스위스 에디토리얼', color: '#f2f0ea' },
        clay:      { name: '소프트 클레이',     color: '#f4eefe' },
        acid:      { name: '애시드 Y2K',        color: '#0b0b0c' }
    };
    const themeKeys = Object.keys(THEMES);
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    const dock = document.getElementById('themeDock');
    const dockToggle = document.getElementById('themeDockToggle');
    const swatches = document.querySelectorAll('.theme-swatch');
    const shuffleBtn = document.getElementById('themeShuffle');
    const toast = document.getElementById('themeToast');
    let toastTimer;

    function showToast(html, duration = 1800) {
        toast.innerHTML = html;
        toast.classList.add('is-visible');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toast.classList.remove('is-visible'), duration);
    }

    function syncThemeUI(theme) {
        swatches.forEach(btn => btn.setAttribute('aria-pressed', String(btn.dataset.theme === theme)));
        if (metaThemeColor) metaThemeColor.setAttribute('content', THEMES[theme].color);
    }

    // origin: 원형 전환 효과가 시작될 화면 좌표
    function setTheme(theme, origin) {
        if (!THEMES[theme] || theme === root.dataset.theme) return;
        try { sessionStorage.setItem('portfolio-theme', theme); } catch (e) {}

        const apply = () => {
            root.setAttribute('data-theme', theme);
            syncThemeUI(theme);
        };

        if (!document.startViewTransition || reduceMotion || document.visibilityState !== 'visible') {
            apply();
        } else {
            const x = origin ? origin.x : window.innerWidth / 2;
            const y = origin ? origin.y : window.innerHeight / 2;
            const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
            const transition = document.startViewTransition(apply);
            transition.ready.then(() => {
                root.animate(
                    { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
                    { duration: 700, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', pseudoElement: '::view-transition-new(root)' }
                );
            }).catch(() => {});
        }

        showToast(`✦ ${THEMES[theme].name}`);
    }

    function centerOf(el) {
        const rect = el.getBoundingClientRect();
        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    }

    const initialTheme = themeKeys.includes(root.dataset.theme) ? root.dataset.theme : themeKeys[0];
    root.setAttribute('data-theme', initialTheme);
    syncThemeUI(initialTheme);

    function setDockOpen(open) {
        dock.classList.toggle('is-open', open);
        dockToggle.setAttribute('aria-expanded', String(open));
        dockToggle.setAttribute('aria-label', open ? '테마 선택 닫기' : '테마 선택 열기');
    }

    // 넓은 화면에서는 독을 펼친 채로 시작, 모바일은 접어 둠
    setDockOpen(window.innerWidth >= 768);
    dockToggle.addEventListener('click', () => setDockOpen(!dock.classList.contains('is-open')));

    swatches.forEach(btn => {
        btn.addEventListener('click', () => setTheme(btn.dataset.theme, centerOf(btn)));
    });

    shuffleBtn.addEventListener('click', () => {
        const others = themeKeys.filter(t => t !== root.dataset.theme);
        setTheme(others[Math.floor(Math.random() * others.length)], centerOf(shuffleBtn));
    });

    // 무작위 테마로 들어온 경우, 세션당 한 번 어떤 테마인지 알려줌
    let pickedTheme = null;
    let greeted = null;
    try {
        pickedTheme = sessionStorage.getItem('portfolio-theme');
        greeted = sessionStorage.getItem('portfolio-theme-greeted');
        sessionStorage.setItem('portfolio-theme-greeted', '1');
    } catch (e) {}

    if (!pickedTheme && !greeted) {
        setTimeout(() => {
            showToast(`오늘의 테마 · <strong>${THEMES[initialTheme].name}</strong><br><small>오른쪽 아래 🎨 버튼으로 바꿀 수 있어요</small>`, 3800);
        }, 1400);
    }

    // ---------------------------------------------
    // 1. 네비게이션 (모바일 메뉴 / 스크롤 진행 바 / 현재 섹션 표시)
    // ---------------------------------------------
    const nav = document.getElementById('nav');
    const hamburger = document.getElementById('hamburger');
    const mobileMenu = document.getElementById('mobileMenu');

    function setMenuOpen(open) {
        nav.classList.toggle('is-open', open);
        hamburger.setAttribute('aria-expanded', String(open));
        hamburger.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
    }

    hamburger.addEventListener('click', () => setMenuOpen(!nav.classList.contains('is-open')));
    mobileMenu.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setMenuOpen(false)));
    document.addEventListener('click', (e) => {
        if (nav.classList.contains('is-open') && !nav.contains(e.target)) setMenuOpen(false);
    });

    const progress = document.getElementById('scrollProgress');
    let ticking = false;

    function updateProgress() {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        progress.style.transform = `scaleX(${max > 0 ? window.scrollY / max : 0})`;
        ticking = false;
    }

    window.addEventListener('scroll', () => {
        if (!ticking) {
            ticking = true;
            requestAnimationFrame(updateProgress);
        }
    }, { passive: true });
    updateProgress();

    const navLinks = document.querySelectorAll('.nav-links a, .mobile-menu a');
    const spyObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            // 수상(#portfolio) 섹션은 Portfolio 메뉴에 묶어서 표시
            const id = entry.target.id === 'portfolio' ? 'webapps' : entry.target.id;
            navLinks.forEach(link => link.classList.toggle('is-active', link.getAttribute('href') === `#${id}`));
        });
    }, { rootMargin: '-45% 0px -50% 0px' });

    document.querySelectorAll('main > section[id]').forEach(section => spyObserver.observe(section));

    // ---------------------------------------------
    // 2. 타이핑 애니메이션 (Hero) — 단어에 맞춰 A / AN 자동 변경
    // ---------------------------------------------
    const typingText = document.querySelector('.typing-text');
    const typingArticle = document.querySelector('.typing-article');

    if (typingText && typingArticle) {
        const phrases = ['EDUCATOR', 'SOFTWARE DEVELOPER', 'INNOVATIVE CREATOR'];
        const articleFor = word => (/^[AEIOU]/.test(word) ? 'AN' : 'A');

        typingArticle.textContent = articleFor(phrases[0]);

        if (reduceMotion) {
            typingText.textContent = phrases[0];
        } else {
            let phraseIdx = 0;
            let charIdx = 0;
            let isDeleting = false;

            const typeEffect = () => {
                const phrase = phrases[phraseIdx];
                let delay;

                if (isDeleting) {
                    charIdx--;
                    delay = 45;
                } else {
                    charIdx++;
                    delay = 110;
                }
                typingText.textContent = phrase.substring(0, charIdx);

                if (!isDeleting && charIdx === phrase.length) {
                    isDeleting = true;
                    delay = 2000; // 단어 완성 후 대기
                } else if (isDeleting && charIdx === 0) {
                    isDeleting = false;
                    phraseIdx = (phraseIdx + 1) % phrases.length;
                    typingArticle.textContent = articleFor(phrases[phraseIdx]);
                    delay = 450;
                }

                setTimeout(typeEffect, delay);
            };

            setTimeout(typeEffect, 900);
        }
    }

    // ---------------------------------------------
    // 3. 카드 스포트라이트 (마우스 위치를 CSS 변수로 전달, PC 전용)
    // ---------------------------------------------
    if (finePointer) {
        document.addEventListener('pointermove', (e) => {
            const tile = e.target.closest ? e.target.closest('.tile') : null;
            if (!tile) return;
            const rect = tile.getBoundingClientRect();
            tile.style.setProperty('--mx', `${e.clientX - rect.left}px`);
            tile.style.setProperty('--my', `${e.clientY - rect.top}px`);
        }, { passive: true });
    }

    // ---------------------------------------------
    // 4. 수상 실적(Awards) 상세 정보 모달
    // ---------------------------------------------
    const awardDetails = {
        awards1: {
            title: "2016 전남 모바일 앱 공모전",
            subtitle: "우수상 (전라남도지사상)",
            image: "images/Awards1.jpg",
            description: "전라남도에서 주최한 전국 단위 모바일 앱 개발 공모전에서 고등학생 신분으로 대학생 및 일반 개발자 팀들과 치열하게 경합하였습니다. 실생활과 밀접하게 연동되는 참신한 교육·생활 융합 모바일 솔루션을 자체 설계 및 코딩하여 독창성과 뛰어난 기술력을 입증하였고, 최종 본선에서 우수상을 당당히 수상하는 쾌거를 이루었습니다."
        },
        awards2: {
            title: "2016 소프트웨어 교육 에듀톤",
            subtitle: "동상 (한국과학창의재단 이사장상)",
            image: "images/Awards2.jpg",
            description: "교육부가 주최하고 한국과학창의재단이 주관하는 소프트웨어 교육 전문 해커톤 대회 '에듀톤(EduThon)'에 예비 교사로서 출전하였습니다. 학생들이 능동적으로 컴퓨팅 사고력(Computational Thinking)을 기를 수 있는 놀이 기반 SW 교육 콘텐츠 및 피드백 중심의 알고리즘 교육 과정 모델을 제시하여 컴퓨터교육 분야에서 우수한 성적으로 동상을 수상하였습니다."
        },
        awards3: {
            title: "멘사코리아 (Mensa Korea)",
            subtitle: "정회원 (IQ 156 이상, 상위 2% 클럽)",
            image: "images/Awards3.jpg",
            description: "세계에서 가장 크고 오래된 고지능자 모임인 멘사(Mensa)의 한국 지부 정식 테스트에 응시하여 지능지수 상위 2% 기준을 탁월한 성적으로 통과하였습니다. 높은 논리력과 고차원적 인지 능력, 복합 문제 해결 기술을 바탕으로 초등교육 및 대학원 AI융합교육 분야에서 융합 인재 양성과 창의적 문제해결 프로세스 설계의 교육적 적용을 위해 적극적으로 힘쓰고 있습니다."
        }
    };

    const modal = document.getElementById('awardModal');
    const modalImg = document.getElementById('modalImg');
    const modalTitle = document.getElementById('modalTitle');
    const modalSubtitle = document.getElementById('modalSubtitle');
    const modalDescription = document.getElementById('modalDescription');
    const modalClose = document.getElementById('modalClose');
    let lastTrigger = null;

    if (modal && modalClose) {
        function openModal(detail, trigger) {
            modalImg.src = detail.image;
            modalImg.alt = detail.title;
            modalTitle.textContent = detail.title;
            modalSubtitle.textContent = detail.subtitle;
            modalDescription.textContent = detail.description;
            lastTrigger = trigger;

            modal.style.display = 'flex';
            requestAnimationFrame(() => modal.classList.add('active'));
            document.body.style.overflow = 'hidden';
            modalClose.focus({ preventScroll: true });
        }

        function closeModal() {
            modal.classList.remove('active');
            setTimeout(() => {
                modal.style.display = 'none';
            }, 300);
            document.body.style.overflow = '';
            if (lastTrigger) lastTrigger.focus({ preventScroll: true });
        }

        document.querySelectorAll('.award-card[data-award]').forEach(card => {
            card.addEventListener('click', () => {
                const detail = awardDetails[card.dataset.award];
                if (detail) openModal(detail, card);
            });
        });

        modalClose.addEventListener('click', closeModal);

        // 모달 바깥 영역을 눌러도 닫힘
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        document.addEventListener('keydown', (e) => {
            if (e.key !== 'Escape') return;
            if (modal.classList.contains('active')) closeModal();
            else if (nav.classList.contains('is-open')) setMenuOpen(false);
        });
    }

    // ---------------------------------------------
    // 5. 스크롤 등장 애니메이션
    // ---------------------------------------------
    // 첫 화면(히어로)은 관찰을 기다리지 않고 바로 등장
    document.querySelectorAll('.hero .reveal').forEach(el => el.classList.add('is-visible'));
    const revealEls = document.querySelectorAll('.reveal:not(.is-visible)');

    if ('IntersectionObserver' in window) {
        const revealObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    revealObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

        revealEls.forEach(el => revealObserver.observe(el));
    } else {
        revealEls.forEach(el => el.classList.add('is-visible'));
    }
});
