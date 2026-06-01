document.addEventListener('DOMContentLoaded', () => {
    // ---------------------------------------------
    // 0. 테마 관리 시스템 (접속 시 무작위 테마 선택 및 수동 변경 지원)
    // ---------------------------------------------
    const themes = ['theme-glass', 'theme-cyber', 'theme-brutalist', 'theme-terminal', 'theme-minimal'];
    
    // 접속할 때마다 다른 테마를 경험할 수 있도록 무작위 배정을 기본값으로 설정하되,
    // 테마 셀렉터로 직접 변경한 경우 해당 세션 동안은 고정되도록 sessionStorage 적용
    let activeTheme = sessionStorage.getItem('selected-portfolio-theme');
    
    if (!activeTheme || !themes.includes(activeTheme)) {
        const randomIndex = Math.floor(Math.random() * themes.length);
        activeTheme = themes[randomIndex];
    }
    
    // body 태그에 테마 클래스 적용
    document.body.className = activeTheme;

    // 테마 셀렉터 버튼들의 active 상태 업데이트 함수
    function updateThemeSelectorUI(themeName) {
        document.querySelectorAll('.theme-option-btn').forEach(btn => {
            if (btn.getAttribute('data-theme') === themeName) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }
    
    updateThemeSelectorUI(activeTheme);

    // 테마 셀렉터 위젯 토글 & 테마 변경 바인딩
    const themeWidget = document.getElementById('themeSwitcherWidget');
    const themeToggle = document.getElementById('themeSwitcherToggle');
    if (themeToggle && themeWidget) {
        themeToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            themeWidget.classList.toggle('active');
        });
        
        document.addEventListener('click', (e) => {
            if (themeWidget.classList.contains('active') && !themeWidget.contains(e.target)) {
                themeWidget.classList.remove('active');
            }
        });
    }

    document.querySelectorAll('.theme-option-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const selectedTheme = btn.getAttribute('data-theme');
            if (themes.includes(selectedTheme)) {
                document.body.className = selectedTheme;
                sessionStorage.setItem('selected-portfolio-theme', selectedTheme);
                updateThemeSelectorUI(selectedTheme);
            }
        });
    });

    // ---------------------------------------------
    // 1. 공통 상수 및 요소 셀렉터
    // ---------------------------------------------
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 1024;
    
    const hamburger = document.getElementById('hamburger');
    const mobileMenu = document.getElementById('mobileMenu');
    const scrollBar = document.getElementById('scrollProgressBar');
    const cursor = document.getElementById('customCursor');
    const follower = document.getElementById('customCursorFollower');
    const navbar = document.querySelector('.navbar');

    // ---------------------------------------------
    // 2. 스크롤 네비게이션 & 네비바 효과
    // ---------------------------------------------
    // 부드러운 스크롤 구현 (네비게이션 클릭 시)
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const target = document.querySelector(targetId);
            if (target) {
                const navHeight = navbar.offsetHeight;
                const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - navHeight;
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

    // 스크롤 시 네비게이션 스타일 및 스크롤 바 너비 계산
    window.addEventListener('scroll', () => {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        
        // 네비게이션 바 블러/음영 효과 제어
        if (scrollTop > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }

        // 스크롤 바 계산
        if (docHeight > 0) {
            const scrollPercent = (scrollTop / docHeight) * 100;
            scrollBar.style.width = `${scrollPercent}%`;
        }
    });

    // ---------------------------------------------
    // 3. 모바일 햄버거 메뉴 및 제어
    // ---------------------------------------------
    if (hamburger && mobileMenu) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            mobileMenu.classList.toggle('active');
        });

        document.querySelectorAll('.mobile-menu a').forEach(link => {
            link.addEventListener('click', () => {
                hamburger.classList.remove('active');
                mobileMenu.classList.remove('active');
            });
        });
    }

    // ---------------------------------------------
    // 4. 타이핑 애니메이션 (Hero Section)
    // ---------------------------------------------
    const typingSpan = document.querySelector('.typing-text');
    if (typingSpan) {
        const phrases = ["EDUCATOR", "SOFTWARE DEVELOPER", "INNOVATIVE CREATOR"];
        let phraseIdx = 0;
        let charIdx = 0;
        let isDeleting = false;
        let delay = 150;

        function typeEffect() {
            const currentPhrase = phrases[phraseIdx];
            if (isDeleting) {
                typingSpan.textContent = currentPhrase.substring(0, charIdx - 1);
                charIdx--;
                delay = 50; // 지울 때는 속도를 빠르게
            } else {
                typingSpan.textContent = currentPhrase.substring(0, charIdx + 1);
                charIdx++;
                delay = 150; // 타이핑 시에는 보통 속도
            }

            if (!isDeleting && charIdx === currentPhrase.length) {
                delay = 2000; // 단어 완성 후 2초간 대기
                isDeleting = true;
            } else if (isDeleting && charIdx === 0) {
                isDeleting = false;
                phraseIdx = (phraseIdx + 1) % phrases.length;
                delay = 500; // 다음 단어 타이핑 시작 전 짧은 대기
            }

            setTimeout(typeEffect, delay);
        }
        
        setTimeout(typeEffect, 1000);
    }

    // ---------------------------------------------
    // 5. PC 전용 커스텀 마우스 포인터
    // ---------------------------------------------
    if (!isMobile && cursor && follower) {
        let mouseX = -100;
        let mouseY = -100;
        let followerX = -100;
        let followerY = -100;

        document.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
            
            cursor.style.left = `${mouseX}px`;
            cursor.style.top = `${mouseY}px`;
        });

        // 쾌적한 렌더링 루프 (Lerp를 사용하여 부드러운 따라오기 효과 구현)
        function updateFollower() {
            const dx = mouseX - followerX;
            const dy = mouseY - followerY;
            
            // 선형 보간 계수 (0.15)로 부드러운 움직임 부여
            followerX += dx * 0.15;
            followerY += dy * 0.15;
            
            follower.style.left = `${followerX}px`;
            follower.style.top = `${followerY}px`;
            
            requestAnimationFrame(updateFollower);
        }
        updateFollower();

        // 마우스 호버 효과
        const hoverables = document.querySelectorAll('a, button, .portfolio-item, .webapp-link, #hamburger, .social-links a');
        hoverables.forEach(item => {
            item.addEventListener('mouseenter', () => {
                cursor.classList.add('hovered');
                follower.classList.add('hovered');
            });
            item.addEventListener('mouseleave', () => {
                cursor.classList.remove('hovered');
                follower.classList.remove('hovered');
            });
        });

        // 마우스가 화면 밖으로 이탈할 때 투명 처리
        document.addEventListener('mouseleave', () => {
            cursor.style.opacity = '0';
            follower.style.opacity = '0';
        });
        document.addEventListener('mouseenter', () => {
            cursor.style.opacity = '1';
            follower.style.opacity = '1';
        });
    } else {
        // 모바일인 경우 마우스 커서 엘리먼트 제거
        if (cursor) cursor.remove();
        if (follower) follower.remove();
    }

    // ---------------------------------------------
    // 6. 히어로 섹션 실시간 인터랙티브 파티클 배경
    // ---------------------------------------------
    const canvas = document.getElementById('hero-canvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        let particles = [];
        let mouse = { x: null, y: null, radius: 120 };

        // 테마의 메인 색상(--primary-color)을 실시간으로 가져와 RGBA 형태로 변환하는 헬퍼 함수
        function getPrimaryColorRGBA(alpha) {
            const primaryColor = getComputedStyle(document.body).getPropertyValue('--primary-color').trim() || '#4f46e5';
            if (primaryColor.startsWith('#')) {
                let r, g, b;
                const hex = primaryColor.replace('#', '');
                if (hex.length === 3) {
                    r = parseInt(hex[0] + hex[0], 16);
                    g = parseInt(hex[1] + hex[1], 16);
                    b = parseInt(hex[2] + hex[2], 16);
                } else if (hex.length === 6) {
                    r = parseInt(hex.substring(0, 2), 16);
                    g = parseInt(hex.substring(2, 4), 16);
                    b = parseInt(hex.substring(4, 6), 16);
                } else {
                    r = 79; g = 70; b = 229;
                }
                return `rgba(${r}, ${g}, ${b}, ${alpha})`;
            }
            return primaryColor;
        }

        // 윈도우 크기에 캔버스 맞추기 (고해상도 디스플레이 대응 포함)
        function resizeCanvas() {
            const dpi = window.devicePixelRatio || 1;
            canvas.width = canvas.parentElement.offsetWidth * dpi;
            canvas.height = canvas.parentElement.offsetHeight * dpi;
            ctx.scale(dpi, dpi);
            initParticles();
        }

        // 파티클 생성 클래스
        class Particle {
            constructor() {
                this.x = Math.random() * canvas.parentElement.offsetWidth;
                this.y = Math.random() * canvas.parentElement.offsetHeight;
                this.size = Math.random() * 2 + 1; // 1~3px 크기
                this.baseX = this.x;
                this.baseY = this.y;
                // 이동 속도 및 방향 설정
                this.vx = (Math.random() - 0.5) * 0.6;
                this.vy = (Math.random() - 0.5) * 0.6;
                this.density = (Math.random() * 20) + 10;
            }

            draw() {
                ctx.fillStyle = getPrimaryColorRGBA(0.4);
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.closePath();
                ctx.fill();
            }

            update() {
                // 자연스러운 유동 움직임
                this.x += this.vx;
                this.y += this.vy;

                // 벽 충돌 검사
                if (this.x < 0 || this.x > canvas.parentElement.offsetWidth) this.vx = -this.vx;
                if (this.y < 0 || this.y > canvas.parentElement.offsetHeight) this.vy = -this.vy;

                // 마우스와의 상호작용 (마우스 근처로 가면 밀려나는 물리 작용 구현)
                if (mouse.x !== null && mouse.y !== null) {
                    let dx = mouse.x - this.x;
                    let dy = mouse.y - this.y;
                    let distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance < mouse.radius) {
                        let force = (mouse.radius - distance) / mouse.radius;
                        let directionX = dx / distance;
                        let directionY = dy / distance;
                        
                        this.x -= directionX * force * 5;
                        this.y -= directionY * force * 5;
                    }
                }
            }
        }

        function initParticles() {
            particles = [];
            const count = Math.min(Math.floor(window.innerWidth / 15), 80); // 가로폭에 비례하여 개수 제한 (성능 고려)
            for (let i = 0; i < count; i++) {
                particles.push(new Particle());
            }
        }

        // 파티클 간 선 그리기
        function connectParticles() {
            for (let a = 0; a < particles.length; a++) {
                for (let b = a; b < particles.length; b++) {
                    let dx = particles[a].x - particles[b].x;
                    let dy = particles[a].y - particles[b].y;
                    let distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < 120) {
                        let alpha = (1 - (distance / 120)) * 0.15;
                        ctx.strokeStyle = getPrimaryColorRGBA(alpha);
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.moveTo(particles[a].x, particles[a].y);
                        ctx.lineTo(particles[b].x, particles[b].y);
                        ctx.stroke();
                    }
                }
            }
        }

        function animateParticles() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            for (let i = 0; i < particles.length; i++) {
                particles[i].draw();
                particles[i].update();
            }
            connectParticles();
            requestAnimationFrame(animateParticles);
        }

        // 마우스 움직임 추적
        if (!isMobile) {
            window.addEventListener('mousemove', (e) => {
                const rect = canvas.getBoundingClientRect();
                mouse.x = e.clientX - rect.left;
                mouse.y = e.clientY - rect.top;
            });
            window.addEventListener('mouseleave', () => {
                mouse.x = null;
                mouse.y = null;
            });
        }

        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();
        animateParticles();
    }

    // ---------------------------------------------
    // 7. PC 전용 마우스 반응형 3D 카드 효과 (Tilt)
    // ---------------------------------------------
    if (!isMobile) {
        const cards = document.querySelectorAll('.webapp-item, .portfolio-item');
        cards.forEach(card => {
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                
                // 중심점 기준 가로/세로 편차 비율 계산 (-0.5 ~ 0.5)
                const xc = rect.width / 2;
                const yc = rect.height / 2;
                const dx = (x - xc) / xc;
                const dy = (y - yc) / yc;

                // 최대 12도 기울어지도록 회전값 산정
                const rotateY = dx * 12;
                const rotateX = -dy * 12;

                card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-8px) scale(1.03)`;
                card.style.boxShadow = '0 20px 40px rgba(79, 70, 229, 0.16)';
            });

            card.addEventListener('mouseleave', () => {
                card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0) scale(1)';
                card.style.boxShadow = 'var(--card-shadow)';
            });
        });
    }

    // ---------------------------------------------
    // 8. 수상 실적(Awards) 상세 정보 레이어 모달 시스템
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

    if (modal && modalClose) {
        const awardItems = document.querySelectorAll('.portfolio-item[data-award]');
        
        awardItems.forEach(item => {
            item.addEventListener('click', () => {
                const awardKey = item.getAttribute('data-award');
                const detail = awardDetails[awardKey];
                
                if (detail) {
                    modalImg.src = detail.image;
                    modalImg.alt = detail.title;
                    modalTitle.textContent = detail.title;
                    modalSubtitle.textContent = detail.subtitle;
                    modalDescription.textContent = detail.description;
                    
                    // 모달 노출 및 스크롤 방지
                    modal.style.display = 'flex';
                    setTimeout(() => {
                        modal.classList.add('active');
                    }, 10);
                    document.body.style.overflow = 'hidden';
                }
            });
        });

        function closeModal() {
            modal.classList.remove('active');
            setTimeout(() => {
                modal.style.display = 'none';
            }, 300);
            document.body.style.overflow = '';
        }

        modalClose.addEventListener('click', closeModal);
        
        // 모달 외부 영역을 클릭했을 때도 닫히도록 설정
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });

        // ESC 키로 닫기 구현
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('active')) {
                closeModal();
            }
        });
    }

    // ---------------------------------------------
    // 9. Intersection Observer (스크롤 트리거 애니메이션)
    // ---------------------------------------------
    const observerOptions = {
        threshold: 0.12,
        rootMargin: '0px 0px -50px 0px'
    };

    const fadeObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                // 한번 나타난 애니메이션은 관찰 대상에서 제외하여 리소스 최적화
                fadeObserver.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // 모든 섹션 및 스킬 영역, 프로젝트 카드에 지연 페이드인 부여
    document.querySelectorAll('section, .skill-category, .webapp-item, .portfolio-item').forEach(el => {
        el.classList.add('fade-in');
        fadeObserver.observe(el);
    });
});