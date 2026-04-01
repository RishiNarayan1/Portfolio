document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Mouse Tooltip (V1 Logic) — throttled
    const tooltip = document.getElementById('coordinate-tooltip');
    let tooltipRAF = null;
    document.addEventListener('mousemove', (e) => {
        if (tooltipRAF) return;
        tooltipRAF = requestAnimationFrame(() => {
            tooltip.textContent = `x: ${e.clientX}, y: ${e.clientY}`;
            tooltipRAF = null;
        });
    }, { passive: true });

    // Setup elements for interaction
    const bgGrid         = document.querySelector('.background-grid');
    const mapTrigger     = document.getElementById('map-trigger');
    const mapCanvas      = document.getElementById('map-canvas');
    const backboardWraps = document.querySelectorAll('.backboard-wrap');
    const balls          = document.querySelectorAll('.basketball');
    const jumpFigure     = document.getElementById('jumpshot');
    const jumpFrames     = jumpFigure ? jumpFigure.querySelectorAll('.jump-frame') : [];

    // 2. Throttled Scroll — uses rAF for smooth 60fps updates
    let scrollTicking = false;
    
    function onScroll() {
        const scrollY = window.scrollY;
        
        // V1 Parallax pan for the aesthetic background
        if (bgGrid) {
             bgGrid.style.backgroundPositionY = `${scrollY * 0.5}px`;
        }

        // V2 3D Cinematic Scroll Logic — Basketball Backboard Timeline
        if (mapTrigger && mapCanvas) {
            const rect = mapTrigger.getBoundingClientRect();
            let scrollProgress = 0;

            if (rect.top <= 0) {
                const totalScrollableHeight = rect.height - window.innerHeight;
                const scrolledPixels = Math.abs(rect.top);
                scrollProgress = Math.min(Math.max(scrolledPixels / totalScrollableHeight, 0), 1);
            }

            if (rect.top > 0) scrollProgress = 0;

            // 1. Background Grid scale & rotate
            const maxScale = 50;
            const currentScale = Math.pow(maxScale, scrollProgress);
            const rotation = scrollProgress * 15;
            mapCanvas.style.transform = `scale(${currentScale}) rotate(${rotation}deg)`;

            // 2. Backboard wraps
            const isMobile = window.innerWidth <= 768;
            const W = window.innerWidth;
            const H = window.innerHeight;
            const xOffset = isMobile ? '0px' : '-40px';

            backboardWraps.forEach(wrap => {
                const threshold  = parseFloat(wrap.getAttribute('data-threshold'));
                const diff       = scrollProgress - threshold;

                if (diff < -0.15) {
                    wrap.style.opacity   = '0';
                    wrap.style.transform = `translate(${xOffset}, -40%) scale(0.5)`;
                    wrap.style.filter    = 'blur(10px)';
                    wrap.style.pointerEvents = 'none';
                } else if (diff >= -0.15 && diff <= 0.15) {
                    let scaleC = 1, opacityC = 1, blurC = 0;
                    if (diff < 0) {
                        const p = (diff + 0.15) / 0.15;
                        scaleC   = 0.5 + p * 0.5;
                        opacityC = p;
                        blurC    = (1 - p) * 10;
                    } else {
                        const p = diff / 0.15;
                        scaleC   = 1 + p * 3;
                        opacityC = 1 - p;
                        blurC    = 0;
                    }
                    wrap.style.opacity   = opacityC;
                    wrap.style.transform = `translate(${xOffset}, -40%) scale(${scaleC})`;
                    wrap.style.filter    = `blur(${blurC}px)`;
                    wrap.style.pointerEvents = opacityC > 0.5 ? 'auto' : 'none';
                } else {
                    wrap.style.opacity   = '0';
                    wrap.style.pointerEvents = 'none';
                }
            });

            // 3. Per-hoop basketball arc
            balls.forEach((ball, i) => {
                const threshold = parseFloat(backboardWraps[i].getAttribute('data-threshold'));
                const window_half = 0.13;
                const start = threshold - window_half;
                const end   = threshold + window_half;

                if (scrollProgress < start || scrollProgress > end) {
                    ball.style.opacity = '0';
                    return;
                }

                const local = (scrollProgress - start) / (end - start);

                const hoopX = W * 0.70 - 230;
                const hoopY = H * 0.50 + 130;

                const startX = W * 0.08;
                const startY = H * 0.96;

                let bx, by, opacity, rotate;
                const figX = startX - 40;
                const figY = startY - 200;

                if (local < 0.45) {
                    opacity = 0;
                    bx = startX; by = startY; rotate = 0;

                    if (jumpFigure) {
                        jumpFigure.style.opacity = Math.min(1, local * 10).toString();
                        jumpFigure.style.transform = `translate(${figX}px, ${figY}px)`;
                        const frameIdx = local < 0.15 ? 0 : local < 0.30 ? 1 : 2;
                        jumpFrames.forEach((f, fi) => f.classList.toggle('active', fi === frameIdx));
                    }

                } else if (local <= 0.68) {
                    const t = (local - 0.45) / 0.23;
                    bx = startX + (hoopX - startX) * t;
                    const arcHeight = H * 0.55;
                    by = startY + (hoopY - startY) * t - arcHeight * 4 * t * (1 - t);
                    opacity = Math.min(1, t * 5);
                    rotate  = t * 360;

                    if (jumpFigure) {
                        jumpFigure.style.opacity = '1';
                        jumpFigure.style.transform = `translate(${figX}px, ${figY}px)`;
                        jumpFrames.forEach((f, fi) => f.classList.toggle('active', fi === 3));
                    }

                } else {
                    const t = (local - 0.68) / 0.32;
                    bx = hoopX;
                    by = hoopY + t * H * 0.35;
                    opacity = 1 - t;
                    rotate  = 360 + t * 180;

                    if (jumpFigure) {
                        jumpFigure.style.opacity = Math.max(0, 1 - t * 2).toString();
                    }
                }

                ball.style.opacity   = opacity;
                ball.style.transform = `translate(${bx - 32}px, ${by - 32}px) rotate(${rotate}deg)`;
            });

            // Hide jumpshot when no hoop is active
            const anyActive = Array.from(backboardWraps).some(wrap => {
                const t = parseFloat(wrap.getAttribute('data-threshold'));
                return scrollProgress >= t - 0.13 && scrollProgress <= t + 0.13;
            });
            if (jumpFigure && !anyActive) jumpFigure.style.opacity = '0';
        }
        
        scrollTicking = false;
    }

    window.addEventListener('scroll', () => {
        if (!scrollTicking) {
            scrollTicking = true;
            requestAnimationFrame(onScroll);
        }
    }, { passive: true });

    // 3. Certification Flip Boxes
    const certCards = document.querySelectorAll('.cert-card');
    certCards.forEach(card => {
        card.addEventListener('click', (e) => {
            if (!e.target.classList.contains('cert-btn')) {
                card.classList.toggle('flipped');
            }
        });
    });

    // 4. Scroll-reveal for project cards
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry, i) => {
            if (entry.isIntersecting) {
                const delay = entry.target.dataset.revealDelay || 0;
                setTimeout(() => {
                    entry.target.classList.add('revealed');
                }, delay);
                revealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15 });

    document.querySelectorAll('.project-card').forEach((card, i) => {
        card.dataset.revealDelay = i * 80;
        revealObserver.observe(card);
    });

    // Reveal plain sections too
    document.querySelectorAll('.reveal-section').forEach(el => {
        revealObserver.observe(el);
    });

    // 5. 3D Magnetic Tilt on project cards (desktop only)
    if (window.innerWidth > 768) {
        document.querySelectorAll('.project-card').forEach(card => {
            card.addEventListener('mousemove', (e) => {
                if (!card.classList.contains('revealed')) return;
                const rect = card.getBoundingClientRect();
                const cx = rect.left + rect.width / 2;
                const cy = rect.top + rect.height / 2;
                const dx = (e.clientX - cx) / (rect.width / 2);
                const dy = (e.clientY - cy) / (rect.height / 2);
                const maxTilt = 4;
                card.style.setProperty('--tilt-x', `${-dy * maxTilt}deg`);
                card.style.setProperty('--tilt-y', `${dx * maxTilt}deg`);
            });

            card.addEventListener('mouseleave', () => {
                card.style.setProperty('--tilt-x', '0deg');
                card.style.setProperty('--tilt-y', '0deg');
            });
        });
    }

    // 6. Hero Stat Counter Animation
    const statValues = document.querySelectorAll('.stat-value[data-target]');
    const counterObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            const el = entry.target;
            const target = parseFloat(el.getAttribute('data-target'));
            const suffix = el.getAttribute('data-suffix') || '';
            const isFloat = !Number.isInteger(target);
            const duration = 1400;
            const startTime = performance.now();

            function tick(now) {
                const elapsed = now - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const eased = 1 - Math.pow(1 - progress, 3);
                const current = target * eased;
                el.textContent = (isFloat ? current.toFixed(2) : Math.floor(current)) + suffix;
                if (progress < 1) requestAnimationFrame(tick);
                else el.textContent = (isFloat ? target.toFixed(2) : target) + suffix;
            }

            requestAnimationFrame(tick);
            counterObserver.unobserve(el);
        });
    }, { threshold: 0.6 });

    statValues.forEach(el => counterObserver.observe(el));

});
