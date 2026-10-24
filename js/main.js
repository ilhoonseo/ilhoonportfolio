document.addEventListener('DOMContentLoaded', () => {
    const root = document.documentElement;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const motion = !reduceMotion;
    const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));
    // <head>의 스크립트가 오프닝 재생 여부를 정해 둠 (CSS의 --intro와 같은 값)
    const introMs = root.classList.contains('no-leader') ? 0 : 1450;

    // ---------------------------------------------
    // 1. 스크롤 등장 — [data-reveal]이 화면에 들어오면 .is-in
    //    (세부 움직임은 CSS가 담당. 이 단계가 준비되면 숨김 해제 안전장치를 끔)
    // ---------------------------------------------
    const revealEls = document.querySelectorAll('[data-reveal]');

    if (motion && 'IntersectionObserver' in window) {
        const revealObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('is-in');
                revealObserver.unobserve(entry.target);
            });
        }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });

        revealEls.forEach(el => revealObserver.observe(el));
    } else {
        revealEls.forEach(el => el.classList.add('is-in'));
    }
    window.__reelReady = true;

    // ---------------------------------------------
    // 2. 라이트/다크 전환 — 새 화면이 아래에서 위로 와이프되며 덮음
    // ---------------------------------------------
    const themeToggle = document.getElementById('themeToggle');
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    const lightQuery = window.matchMedia('(prefers-color-scheme: light)');

    function currentTheme() {
        const theme = root.getAttribute('data-theme');
        if (theme === 'light' || theme === 'dark') return theme;
        return lightQuery.matches ? 'light' : 'dark';
    }

    function syncTheme() {
        const isDark = currentTheme() === 'dark';
        if (themeToggle) themeToggle.setAttribute('aria-label', isDark ? '라이트 모드로 전환' : '다크 모드로 전환');
        if (metaThemeColor) {
            const bg = getComputedStyle(root).getPropertyValue('--bg').trim();
            metaThemeColor.setAttribute('content', bg || (isDark ? '#0e0f13' : '#f1f2f5'));
        }
    }

    syncTheme();
    if (lightQuery.addEventListener) lightQuery.addEventListener('change', syncTheme);
    new MutationObserver(syncTheme).observe(root, { attributes: true, attributeFilter: ['data-theme'] });

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const next = currentTheme() === 'dark' ? 'light' : 'dark';
            try { localStorage.setItem('reel-theme', next); } catch (e) {}
            const apply = () => root.setAttribute('data-theme', next);

            if (!document.startViewTransition || !motion || document.visibilityState !== 'visible') {
                apply();
                return;
            }
            const transition = document.startViewTransition(apply);
            transition.ready.then(() => {
                root.animate(
                    { clipPath: ['inset(100% 0 0 0)', 'inset(0 0 0 0)'] },
                    { duration: 700, easing: 'cubic-bezier(0.7, 0, 0.3, 1)', pseudoElement: '::view-transition-new(root)' }
                );
            }).catch(() => {});
        });
    }

    // ---------------------------------------------
    // 3. 네비게이션 (모바일 메뉴 / 현재 장면 표시)
    // ---------------------------------------------
    const nav = document.getElementById('nav');
    const hamburger = document.getElementById('hamburger');
    const mobileMenu = document.getElementById('mobileMenu');

    function setMenuOpen(open) {
        nav.classList.toggle('is-open', open);
        document.body.classList.toggle('menu-open', open);
        hamburger.setAttribute('aria-expanded', String(open));
        hamburger.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
    }

    hamburger.addEventListener('click', () => setMenuOpen(!nav.classList.contains('is-open')));
    mobileMenu.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setMenuOpen(false)));

    const scenes = [...document.querySelectorAll('main > section[id], footer[data-scene]')];
    const navLinks = document.querySelectorAll('.nav-links a, .mobile-menu-links a');
    const hudScene = document.getElementById('hudScene');

    if ('IntersectionObserver' in window) {
        const spyObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                const scene = entry.target;
                if (hudScene && scene.dataset.scene) hudScene.textContent = scene.dataset.scene;
                // 엔딩 크레딧(footer)은 Contact 메뉴에 묶어서 표시
                const id = scene.id || scene.dataset.nav;
                if (id) navLinks.forEach(link => link.classList.toggle('is-active', link.getAttribute('href') === `#${id}`));
            });
        }, { rootMargin: '-45% 0px -50% 0px' });

        scenes.forEach(scene => spyObserver.observe(scene));
    }

    // ---------------------------------------------
    // 4. 히어로 직업 롤러 — 글자 단위로 위로 빠지고 새 단어가 올라옴, 단어에 맞춰 A / AN
    // ---------------------------------------------
    const roller = document.getElementById('roleRoller');
    const roleArticle = document.getElementById('roleArticle');

    if (roller && roleArticle) {
        const phrases = ['EDUCATOR', 'SOFTWARE DEVELOPER', 'INNOVATIVE CREATOR'];
        const articleFor = word => (/^[AEIOU]/.test(word) ? 'AN' : 'A');

        const makeWord = (text) => {
            const word = document.createElement('span');
            word.className = 'roll-word';
            [...text].forEach((char, i) => {
                const ch = document.createElement('span');
                ch.className = 'roll-ch';
                ch.style.setProperty('--i', i);
                ch.textContent = char === ' ' ? ' ' : char;
                word.appendChild(ch);
            });
            return word;
        };

        roleArticle.textContent = articleFor(phrases[0]);

        if (motion) {
            let index = 0;
            let current = makeWord(phrases[0]);
            roller.textContent = '';
            roller.appendChild(current);
            roller.style.width = `${current.offsetWidth}px`;

            const next = () => {
                index = (index + 1) % phrases.length;
                const incoming = makeWord(phrases[index]);
                incoming.classList.add('is-enter');
                roller.appendChild(incoming);
                roller.style.width = `${incoming.offsetWidth}px`;
                roleArticle.textContent = articleFor(phrases[index]);

                const outgoing = current;
                outgoing.classList.add('is-leave');
                requestAnimationFrame(() => requestAnimationFrame(() => incoming.classList.remove('is-enter')));
                setTimeout(() => outgoing.remove(), 900);
                current = incoming;
                setTimeout(next, 2600);
            };

            setTimeout(next, introMs + 2600);

            // 웹폰트가 늦게 들어오면 폭을 다시 잼
            if (document.fonts && document.fonts.ready) {
                document.fonts.ready.then(() => { roller.style.width = `${current.offsetWidth}px`; });
            }
        }
    }

    // ---------------------------------------------
    // 5. 스크롤 엔진 — 진행률(--p), 타임코드, 스크러버, 히어로 글자 폭, 리본 속도
    // ---------------------------------------------
    const hero = document.querySelector('.hero');
    const heroWord = document.getElementById('heroWord');
    const hudBar = document.getElementById('hudBar');
    const timecode = document.getElementById('timecode');
    const scrubber = document.getElementById('scrubber');
    const timeline = document.getElementById('timeline');
    const tlLayers = timeline ? [...timeline.querySelectorAll('.tl-layer')] : [];
    const kinetic = document.querySelector('.kinetic');
    const scrubEls = [...document.querySelectorAll('[data-scrub]')];
    const ribbons = [...document.querySelectorAll('.ribbon-track')].map(track => ({
        track,
        speed: parseFloat(track.dataset.speed) || 0.5,
        x: 0,
        half: 0
    }));

    // 페이지 전체를 1분 30초(24fps)짜리 영상으로 보고 스크롤 위치에 타임코드를 매김
    const FPS = 24;
    const RUNTIME = 90;
    const pad = n => String(n).padStart(2, '0');

    function formatTimecode(totalFrames) {
        const seconds = Math.floor(totalFrames / FPS);
        return `${pad(Math.floor(seconds / 3600))}:${pad(Math.floor(seconds / 60) % 60)}:${pad(seconds % 60)}:${pad(totalFrames % FPS)}`;
    }

    let vh = window.innerHeight;
    let maxScroll = 1;
    let lastY = -1;
    let velocity = 0;
    let lastSkew = 0;
    let heroW = 125;
    let markers = [];

    function buildMarkers() {
        if (!scrubber) return;
        markers.forEach(marker => marker.el.remove());
        markers = scenes.filter(scene => scene.id).map(scene => {
            const at = clamp((scene.getBoundingClientRect().top + window.scrollY) / maxScroll);
            const el = document.createElement('a');
            el.className = 'scrubber-mark';
            el.href = `#${scene.id}`;
            el.tabIndex = -1;
            el.title = scene.dataset.scene || scene.id;
            el.style.setProperty('--at', at.toFixed(4));
            scrubber.appendChild(el);
            return { el, at };
        });
    }

    function measure() {
        vh = window.innerHeight;
        maxScroll = Math.max(1, document.documentElement.scrollHeight - vh);
        ribbons.forEach(ribbon => { ribbon.half = ribbon.track.scrollWidth / 2; });
        buildMarkers();
        lastY = -1;
    }

    function updateTimeline() {
        const rect = timeline.getBoundingClientRect();
        if (rect.bottom < -100 || rect.top > vh + 100) return;
        // 패널이 화면 아래쪽에 들어올 때 START, 위쪽으로 빠질 때 NOW
        const tp = clamp((vh * 0.82 - rect.top) / (rect.height + vh * 0.3));
        timeline.style.setProperty('--tp', tp.toFixed(4));
        tlLayers.forEach(layer => {
            const start = parseFloat(layer.dataset.start);
            const end = parseFloat(layer.dataset.end);
            layer.classList.toggle('is-active', tp >= start && tp <= end);
        });
    }

    function updateScroll(y) {
        const progress = clamp(y / maxScroll);
        if (hudBar) hudBar.style.setProperty('--progress', progress.toFixed(4));
        if (timecode) timecode.textContent = formatTimecode(Math.round(progress * RUNTIME * FPS));
        nav.classList.toggle('is-scrolled', y > 24);
        markers.forEach(marker => marker.el.classList.toggle('is-passed', progress >= marker.at - 0.002));

        if (!motion) return;

        // 히어로: 스크롤할수록 ILHOON 글자 폭이 좁아지고 위로 빠짐
        if (hero) {
            const hp = clamp(y / (hero.offsetHeight * 0.85));
            hero.style.setProperty('--hp', hp.toFixed(4));
            heroW = 125 - hp * 50;
            if (heroWord) heroWord.style.setProperty('--hw', heroW.toFixed(1));
            if (heroPointer) stretchLetters(heroLetters, heroPointer, heroOpts);
        }

        scrubEls.forEach(el => {
            const rect = el.getBoundingClientRect();
            if (rect.bottom < -200 || rect.top > vh + 200) return;
            const p = clamp((vh - rect.top) / (vh + rect.height));
            el.style.setProperty('--p', p.toFixed(4));
            // 스킬 줄: 화면 아래에서 가운데로 올라오는 동안 외곽선이 왼쪽부터 채워짐
            if (el.classList.contains('k-row')) el.style.setProperty('--fill', clamp((p - 0.12) / 0.36).toFixed(4));
        });

        if (timeline) updateTimeline();
    }

    function tick() {
        const y = window.scrollY;
        const dy = lastY < 0 ? 0 : y - lastY;
        if (y !== lastY) {
            updateScroll(y);
            lastY = y;
        }

        if (motion) {
            velocity = velocity * 0.86 + dy * 0.14;

            // 빠르게 스크롤하면 스킬 글자가 진행 방향으로 기울어짐
            const skew = clamp(velocity * -0.25, -9, 9);
            if (kinetic && Math.abs(skew - lastSkew) > 0.02) {
                kinetic.style.setProperty('--skew', skew.toFixed(2));
                lastSkew = skew;
            }

            const boost = 1 + Math.min(Math.abs(velocity) * 0.12, 6);
            ribbons.forEach(ribbon => {
                if (!ribbon.half) return;
                ribbon.x -= ribbon.speed * boost;
                if (ribbon.x <= -ribbon.half) ribbon.x += ribbon.half;
                if (ribbon.x > 0) ribbon.x -= ribbon.half;
                ribbon.track.style.transform = `translate3d(${ribbon.x.toFixed(2)}px, 0, 0)`;
            });

            updatePointerEffects();
        }

        requestAnimationFrame(tick);
    }

    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(measure, 150);
    });
    window.addEventListener('load', measure);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);

    // ---------------------------------------------
    // 6. 마우스 효과 (PC 전용) — 도형 시차, 가까운 글자 늘이기, 커서 링
    // ---------------------------------------------
    let heroPointer = null;
    let heroLetters = [];
    const heroOpts = { radius: 260, base: () => heroW, near: 64 };
    let mx = 0;
    let my = 0;
    let targetMx = 0;
    let targetMy = 0;

    // 글자 중심은 포인터가 들어올 때 한 번 재 둠 (글자 폭이 바뀌어도 기준이 흔들리지 않게)
    function cacheLetters(letters) {
        return letters.map(el => {
            const rect = el.getBoundingClientRect();
            return { el, cx: rect.left + rect.width / 2, cy: rect.top + rect.height / 2 };
        });
    }

    function stretchLetters(letters, pointer, opts) {
        const base = opts.base();
        letters.forEach(item => {
            const k = clamp(1 - Math.hypot(pointer.x - item.cx, (pointer.y - item.cy) * 0.6) / opts.radius);
            const w = base + (opts.near - base) * k;
            item.el.style.setProperty(opts.prop || '--lw', w.toFixed(1));
            if (opts.hot) item.el.classList.toggle('is-hot', k > 0.5);
        });
    }

    function resetLetters(letters, opts) {
        letters.forEach(item => {
            item.el.style.removeProperty(opts.prop || '--lw');
            item.el.classList.remove('is-hot');
        });
    }

    let cursor = null;
    let cursorLabel = null;
    let cursorX = 0;
    let cursorY = 0;
    let cursorTargetX = 0;
    let cursorTargetY = 0;

    function updatePointerEffects() {
        if (hero && (Math.abs(targetMx - mx) > 0.001 || Math.abs(targetMy - my) > 0.001)) {
            mx += (targetMx - mx) * 0.08;
            my += (targetMy - my) * 0.08;
            hero.style.setProperty('--mx', mx.toFixed(3));
            hero.style.setProperty('--my', my.toFixed(3));
        }
        if (cursor) {
            cursorX += (cursorTargetX - cursorX) * 0.22;
            cursorY += (cursorTargetY - cursorY) * 0.22;
            cursor.style.transform = `translate3d(${cursorX.toFixed(1)}px, ${cursorY.toFixed(1)}px, 0)`;
        }
    }

    if (motion && finePointer) {
        if (hero && heroWord) {
            const heroSpans = [...heroWord.querySelectorAll('.ch > span')];
            hero.addEventListener('pointerenter', () => { heroLetters = cacheLetters(heroSpans); });
            hero.addEventListener('pointermove', (e) => {
                const rect = hero.getBoundingClientRect();
                targetMx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
                targetMy = ((e.clientY - rect.top) / rect.height) * 2 - 1;
                if (!heroLetters.length) heroLetters = cacheLetters(heroSpans);
                heroPointer = { x: e.clientX, y: e.clientY };
                stretchLetters(heroLetters, heroPointer, heroOpts);
            }, { passive: true });
            hero.addEventListener('pointerleave', () => {
                targetMx = 0;
                targetMy = 0;
                heroPointer = null;
                resetLetters(heroLetters, heroOpts);
                heroLetters = [];
            });
            window.addEventListener('scroll', () => { if (heroPointer) heroLetters = cacheLetters(heroSpans); }, { passive: true });
        }

        const talkBig = document.getElementById('talkBig');
        if (talkBig) {
            const talkSpans = [...talkBig.querySelectorAll('.tc')];
            const talkOpts = { radius: 220, base: () => 92, near: 125, prop: '--w', hot: true };
            let talkLetters = [];
            talkBig.addEventListener('pointerenter', () => { talkLetters = cacheLetters(talkSpans); });
            talkBig.addEventListener('pointermove', (e) => {
                if (!talkLetters.length) talkLetters = cacheLetters(talkSpans);
                stretchLetters(talkLetters, { x: e.clientX, y: e.clientY }, talkOpts);
            }, { passive: true });
            talkBig.addEventListener('pointerleave', () => {
                resetLetters(talkLetters, talkOpts);
                talkLetters = [];
            });
        }

        cursor = document.createElement('div');
        cursor.className = 'cursor';
        cursor.setAttribute('aria-hidden', 'true');
        cursorLabel = document.createElement('span');
        cursor.appendChild(cursorLabel);
        document.body.appendChild(cursor);

        document.addEventListener('pointermove', (e) => {
            if (e.pointerType !== 'mouse') return;
            cursorTargetX = e.clientX;
            cursorTargetY = e.clientY;
            if (!cursor.classList.contains('is-visible')) {
                cursorX = cursorTargetX;
                cursorY = cursorTargetY;
                cursor.classList.add('is-visible');
            }
        }, { passive: true });

        document.documentElement.addEventListener('mouseleave', () => cursor.classList.remove('is-visible'));

        document.addEventListener('pointerover', (e) => {
            const target = e.target.closest ? e.target.closest('[data-cursor], a, button') : null;
            const label = target ? target.dataset.cursor : '';
            cursor.classList.toggle('is-label', !!label);
            cursor.classList.toggle('is-hover', !!target && !label);
            if (label) cursorLabel.textContent = label;
        });
    }

    // ---------------------------------------------
    // 7. 작업물 미리보기 루프 — 화면 밖에서는 멈춤
    // ---------------------------------------------
    if ('IntersectionObserver' in window) {
        const viewerObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => entry.target.classList.toggle('is-paused', !entry.isIntersecting));
        }, { threshold: 0.05 });

        document.querySelectorAll('.viewer').forEach(viewer => viewerObserver.observe(viewer));
    }

    // 모션을 끈 경우: 타임라인은 마지막(NOW) 레이어를 켜 둔 완성 상태로
    if (!motion) tlLayers.forEach(layer => layer.classList.toggle('is-active', layer.classList.contains('is-now')));

    measure();
    requestAnimationFrame(tick);

    // ---------------------------------------------
    // 8. 수상 실적(Awards) 상세 정보 모달
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
    let modalTimer;

    const isModalOpen = () => modal && modal.classList.contains('is-open');

    if (modal && modalClose) {
        function openModal(detail, trigger) {
            modalImg.src = detail.image;
            modalImg.alt = detail.title;
            modalTitle.textContent = detail.title;
            modalSubtitle.textContent = detail.subtitle;
            modalDescription.textContent = detail.description;
            lastTrigger = trigger;

            clearTimeout(modalTimer);
            modal.hidden = false;
            requestAnimationFrame(() => requestAnimationFrame(() => modal.classList.add('is-open')));
            document.body.classList.add('modal-open');
            modalClose.focus({ preventScroll: true });
        }

        function closeModal() {
            modal.classList.remove('is-open');
            document.body.classList.remove('modal-open');
            modalTimer = setTimeout(() => { modal.hidden = true; }, motion ? 400 : 0);
            if (lastTrigger) lastTrigger.focus({ preventScroll: true });
        }

        document.querySelectorAll('.frame[data-award]').forEach(card => {
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
            if (e.key === 'Escape') {
                if (isModalOpen()) closeModal();
                else if (nav.classList.contains('is-open')) setMenuOpen(false);
            } else if (e.key === 'Tab' && isModalOpen()) {
                // 모달 안에서 누를 수 있는 건 닫기 버튼뿐이라 포커스를 붙잡아 둠
                e.preventDefault();
                modalClose.focus();
            }
        });
    }
});
