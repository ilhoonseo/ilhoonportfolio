document.addEventListener('DOMContentLoaded', () => {
    const root = document.documentElement;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    // 기기에서 '애니메이션 줄이기'를 켰으면 <head>의 스크립트가 .still을 붙여 둠.
    // 그때는 멈춘 화면으로 시작하고, 하단 재생 버튼을 누르면 startMotion()으로 켬
    let motion = !root.classList.contains('still');
    const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));
    const pad = n => String(n).padStart(2, '0');
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
    // 3. 네비게이션 (모바일 메뉴 / 현재 장면 표시 / 화면 밖 장면 멈춤)
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
    const sceneVisible = new Map();
    const isVisible = el => !!el && sceneVisible.get(el) !== false;
    let offscreenObserver = null;

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

        // 화면에서 벗어난 장면은 CSS 애니메이션과 JS 루프를 멈춰 둠 (startMotion에서 관찰 시작)
        offscreenObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                sceneVisible.set(entry.target, entry.isIntersecting);
                entry.target.classList.toggle('is-offscreen', !entry.isIntersecting);
            });
        }, { rootMargin: '120px 0px' });

        scenes.forEach(scene => spyObserver.observe(scene));
    }

    // ---------------------------------------------
    // 4. 재생 / 일시정지 — 하단 버튼 하나로 화면의 모든 움직임을 멈추거나 이어서 재생
    // ---------------------------------------------
    const playToggle = document.getElementById('playToggle');
    const hudState = document.getElementById('hudState');
    let playing = motion;

    function setPlaying(next) {
        playing = next;
        root.classList.toggle('is-paused', motion && !next);
        if (playToggle) playToggle.setAttribute('aria-label', next ? '움직임 일시정지' : '움직임 재생');
        if (hudState) hudState.textContent = next ? 'REC' : 'Paused';
    }

    // '애니메이션 줄이기' 기기에서 재생을 고르면 이 기기에 기억해 두고 다음부터 바로 재생
    function rememberMotion(on) {
        if (!prefersReduced) return;
        try {
            if (on) localStorage.setItem('reel-motion', 'play');
            else localStorage.removeItem('reel-motion');
        } catch (e) {}
    }

    if (playToggle) {
        playToggle.addEventListener('click', () => {
            if (!motion) startMotion();
            setPlaying(!playing);
            rememberMotion(playing);
        });
    }
    setPlaying(playing);

    // ---------------------------------------------
    // 5. 히어로 샷 시퀀스 — ILHOON → EDUCATOR → DEVELOPER → CREATOR를 컬러바 전환으로 반복
    // ---------------------------------------------
    const hero = document.querySelector('.hero');
    const stage = document.getElementById('stage');
    const shots = stage ? [...stage.querySelectorAll('.shot')] : [];
    const heroCut = document.getElementById('heroCut');
    const shotNo = document.getElementById('shotNo');

    const SHOT_MS = [4200, 2900, 2900, 2900];
    const CUT_MS = 1080;  // .cut 막대 애니메이션 길이 (0.95s + 막대 사이 시차)
    const SWAP_MS = 530;  // 막대가 화면을 전부 덮고 있는 순간에 샷을 바꿈
    const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<>/{}#$%&*+=';
    let shotIndex = 0;
    let shotClock = -introMs; // 첫 샷은 오프닝이 끝난 뒤부터 셈
    let cutClock = -1;        // 전환 중이 아니면 -1
    let cutCount = 0;
    let swapped = false;
    let scramble = null;

    // 역할 단어는 화면 폭에 꽉 차게 글자 크기를 맞춤
    function fitShots() {
        if (!stage) return;
        const width = stage.clientWidth * 0.97;
        shots.forEach(shot => {
            const word = shot.querySelector('.shot-word');
            if (!word) return;
            shot.style.setProperty('--fs', '100px');
            const natural = word.getBoundingClientRect().width;
            if (natural > 0) shot.style.setProperty('--fs', `${Math.min(200, (100 * width) / natural).toFixed(2)}px`);
        });
    }

    function startScramble(word) {
        const letters = [...word.querySelectorAll('.sl')];
        letters.forEach(el => {
            if (!el.dataset.final) el.dataset.final = el.textContent;
            // 무작위 문자가 지나가도 글자 자리가 흔들리지 않게 폭을 고정
            el.style.width = `${el.getBoundingClientRect().width}px`;
        });
        scramble = { letters, t: 0, sinceRoll: 1000 };
    }

    function updateScramble(dt) {
        scramble.t += dt;
        scramble.sinceRoll += dt;
        const reroll = scramble.sinceRoll >= 55;
        if (reroll) scramble.sinceRoll = 0;
        let done = true;
        scramble.letters.forEach((el, i) => {
            if (scramble.t >= 260 + i * 70) {
                if (el.textContent !== el.dataset.final) el.textContent = el.dataset.final;
            } else {
                done = false;
                if (reroll) el.textContent = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
            }
        });
        if (done) {
            scramble.letters.forEach(el => el.style.removeProperty('width'));
            scramble = null;
        }
    }

    function startCut() {
        cutClock = 0;
        swapped = false;
        heroCut.classList.remove('is-on');
        heroCut.classList.toggle('is-rows', cutCount % 2 === 1);
        void heroCut.offsetWidth; // 애니메이션을 처음부터 다시 재생
        heroCut.classList.add('is-on');
        hero.classList.add('is-cut');
        cutCount += 1;
    }

    function swapShot() {
        shots[shotIndex].classList.remove('is-on');
        shotIndex = (shotIndex + 1) % shots.length;
        stage.style.setProperty('--sd', '0.12s');
        shots[shotIndex].classList.add('is-on');
        if (shotNo) shotNo.textContent = `Shot ${pad(shotIndex + 1)}`;
        const word = shots[shotIndex].querySelector('[data-scramble]');
        if (word) startScramble(word);
        hero.classList.remove('is-cut');
        shotClock = 0;
    }

    function updateShots(dt) {
        shotClock += dt;
        if (cutClock >= 0) {
            cutClock += dt;
            if (!swapped && cutClock >= SWAP_MS) {
                swapShot();
                swapped = true;
            }
            if (cutClock >= CUT_MS) {
                cutClock = -1;
                heroCut.classList.remove('is-on');
            }
        } else if (shotClock >= SHOT_MS[shotIndex]) {
            startCut();
        }
        if (scramble) updateScramble(dt);
    }

    // ---------------------------------------------
    // 6. 흐르는 띠 — 히어로 리본과 스킬 줄. 스크롤 속도만큼 빨라지고, 스킬 줄은 마우스를 올리면 느려짐
    // ---------------------------------------------
    const skills = document.getElementById('skills');
    const kinetic = document.querySelector('.kinetic');
    const kRows = [...document.querySelectorAll('.k-row')];
    const marquees = [];

    document.querySelectorAll('.ribbon-track').forEach(track => {
        // data-speed는 60fps 기준 한 프레임에 움직이는 픽셀 수
        marquees.push({ track, area: hero, speed: (parseFloat(track.dataset.speed) || 0.5) * 60, x: 0, half: 0, mul: 1, targetMul: 1 });
    });

    function buildSkillTrack(row) {
        const name = row.querySelector('.k-name').textContent.trim();
        const glyphClass = row.querySelector('.k-glyph').className;
        let track = row.querySelector('.k-track');
        if (!track) {
            track = document.createElement('div');
            track.className = 'k-track';
            track.setAttribute('aria-hidden', 'true');
            row.appendChild(track);
        }
        track.textContent = '';

        // 꽉 찬 단어 · 도형 · 외곽선 단어 · 도형을 한 묶음으로, 화면보다 넓어질 때까지 반복
        const addUnit = () => {
            [false, true].forEach(outline => {
                const word = document.createElement('span');
                word.className = outline ? 'k-word is-outline' : 'k-word';
                word.textContent = name;
                const glyph = document.createElement('span');
                glyph.className = glyphClass;
                track.append(word, glyph);
            });
        };
        addUnit();
        const reps = Math.max(1, Math.ceil((window.innerWidth * 1.15) / track.getBoundingClientRect().width));
        for (let i = 1; i < reps; i++) addUnit();
        // 같은 내용을 한 번 더 이어 붙여, 절반만큼 흐르면 처음과 똑같아 보이게 함
        [...track.children].forEach(child => track.appendChild(child.cloneNode(true)));
        return track;
    }

    function setupSkillMarquees() {
        kRows.forEach((row, i) => {
            row.classList.add('is-marquee');
            const item = { track: buildSkillTrack(row), area: skills, speed: (i % 2 ? -1 : 1) * (36 + (i % 3) * 10), x: 0, half: 0, mul: 1, targetMul: 1, row };
            row.addEventListener('pointerenter', () => { item.targetMul = 0.15; });
            row.addEventListener('pointerleave', () => { item.targetMul = 1; });
            marquees.push(item);
        });
    }

    function updateMarquees(dt, boost) {
        marquees.forEach(item => {
            item.mul += (item.targetMul - item.mul) * 0.08;
            if (!item.half || !isVisible(item.area)) return;
            item.x -= (item.speed * boost * item.mul * dt) / 1000;
            if (item.x <= -item.half) item.x += item.half;
            if (item.x > 0) item.x -= item.half;
            item.track.style.transform = `translate3d(${item.x.toFixed(2)}px, 0, 0)`;
        });
    }

    // ---------------------------------------------
    // 7. 학력 타임라인 — 재생 헤드가 START → NOW로 저절로 지나가고, 잠깐 멈췄다 되감기를 반복
    // ---------------------------------------------
    const about = document.getElementById('about');
    const timeline = document.getElementById('timeline');
    const tlLayers = timeline ? [...timeline.querySelectorAll('.tl-layer')] : [];
    const TL_PLAY = 6000;
    const TL_HOLD = 1400;
    const TL_BACK = 700;
    let tlClock = 0;

    function updateTimeline(dt) {
        tlClock = (tlClock + dt) % (TL_PLAY + TL_HOLD + TL_BACK);
        let tp = 1;
        if (tlClock < TL_PLAY) {
            tp = tlClock / TL_PLAY;
        } else if (tlClock >= TL_PLAY + TL_HOLD) {
            const k = (tlClock - TL_PLAY - TL_HOLD) / TL_BACK;
            tp = 1 - (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
        }
        timeline.style.setProperty('--tp', tp.toFixed(4));
        tlLayers.forEach(layer => {
            layer.classList.toggle('is-active', tp >= parseFloat(layer.dataset.start) && tp <= parseFloat(layer.dataset.end));
        });
    }

    // 모션을 끈 경우: 마지막(NOW) 레이어를 켜 둔 완성 상태로
    if (!motion) tlLayers.forEach(layer => layer.classList.toggle('is-active', layer.classList.contains('is-now')));

    // ---------------------------------------------
    // 8. 엔딩 크레딧 — 목록을 한 번 더 이어 붙여 끝없이 올라가게
    // ---------------------------------------------
    const creditsWindow = document.getElementById('creditsWindow');

    function setupCredits() {
        if (!creditsWindow) return;
        const track = creditsWindow.querySelector('.credits-track');
        const copy = track.querySelector('.credits-list').cloneNode(true);
        copy.setAttribute('aria-hidden', 'true');
        track.appendChild(copy);
        creditsWindow.classList.add('is-rolling');
    }

    // ---------------------------------------------
    // 9. HUD — 타임코드(재생 시간), 스크러버(페이지 위치), 장면 표시
    // ---------------------------------------------
    const hudBar = document.getElementById('hudBar');
    const timecode = document.getElementById('timecode');
    const scrubber = document.getElementById('scrubber');
    const FPS = 24;

    function formatTimecode(totalFrames) {
        const seconds = Math.floor(totalFrames / FPS);
        return `${pad(Math.floor(seconds / 3600))}:${pad(Math.floor(seconds / 60) % 60)}:${pad(seconds % 60)}:${pad(totalFrames % FPS)}`;
    }

    let vh = window.innerHeight;
    let maxScroll = 1;
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

    function updateScroll(y) {
        const progress = clamp(y / maxScroll);
        if (hudBar) hudBar.style.setProperty('--progress', progress.toFixed(4));
        nav.classList.toggle('is-scrolled', y > 24);
        markers.forEach(marker => marker.el.classList.toggle('is-passed', progress >= marker.at - 0.002));
        // 히어로는 스크롤하면 위로 빠지며 흐려짐
        if (motion && hero) hero.style.setProperty('--hp', clamp(y / (hero.offsetHeight * 0.85)).toFixed(4));
    }

    function measure() {
        vh = window.innerHeight;
        if (motion) kRows.forEach(buildSkillTrack);
        marquees.forEach(item => {
            item.half = item.track.scrollWidth / 2;
            item.x = 0;
        });
        fitShots();
        maxScroll = Math.max(1, document.documentElement.scrollHeight - vh);
        buildMarkers();
        lastY = -1;
    }

    // ---------------------------------------------
    // 10. 마우스 효과 (PC 전용) — 도형 시차, 커서 링
    // ---------------------------------------------
    let mx = 0;
    let my = 0;
    let targetMx = 0;
    let targetMy = 0;
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

    function setupPointer() {
        if (hero) {
            hero.addEventListener('pointermove', (e) => {
                const rect = hero.getBoundingClientRect();
                targetMx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
                targetMy = ((e.clientY - rect.top) / rect.height) * 2 - 1;
            }, { passive: true });
            hero.addEventListener('pointerleave', () => {
                targetMx = 0;
                targetMy = 0;
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
    // 11. 매 프레임 루프 — 일시정지 중이면 시간이 흐르지 않음
    // ---------------------------------------------
    let lastY = -1;
    let lastTime = -1;
    let velocity = 0;
    let lastSkew = 0;
    let playClock = 0;
    let lastFrameNo = -1;

    function tick(now) {
        const dt = lastTime < 0 ? 0 : Math.min(now - lastTime, 100);
        lastTime = now;

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

            if (playing) {
                playClock += dt;
                if (stage && isVisible(hero)) updateShots(dt);
                updateMarquees(dt, 1 + Math.min(Math.abs(velocity) * 0.12, 6));
                if (timeline && timeline.classList.contains('is-in') && isVisible(about)) updateTimeline(dt);
            }

            const frameNo = Math.floor((playClock / 1000) * FPS);
            if (timecode && frameNo !== lastFrameNo) {
                timecode.textContent = formatTimecode(frameNo);
                lastFrameNo = frameNo;
            }

            updatePointerEffects();
        }

        requestAnimationFrame(tick);
    }

    let resizeTimer;
    let lastWidth = window.innerWidth;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            // 휴대폰 주소창이 접히며 높이만 바뀌는 경우엔 띠를 다시 만들지 않음
            if (window.innerWidth !== lastWidth) {
                lastWidth = window.innerWidth;
                measure();
            } else {
                vh = window.innerHeight;
                maxScroll = Math.max(1, document.documentElement.scrollHeight - vh);
                lastY = -1;
            }
        }, 150);
    });
    window.addEventListener('load', measure);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);

    // ---------------------------------------------
    // 움직임 켜기 — 처음부터 재생하는 경우, 또는 멈춘 화면에서 재생 버튼을 눌렀을 때 한 번 실행
    // ---------------------------------------------
    let motionReady = false;

    function startMotion() {
        motion = true;
        if (motionReady) return;
        motionReady = true;
        root.classList.remove('still');
        root.classList.add('motion');
        if (offscreenObserver) scenes.forEach(scene => offscreenObserver.observe(scene));
        setupSkillMarquees();
        setupCredits();
        if (finePointer) setupPointer();
        measure();
    }

    if (motion) startMotion();
    else measure();
    requestAnimationFrame(tick);

    // ---------------------------------------------
    // 12. 수상 실적(Awards) 상세 정보 모달
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
