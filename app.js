(() => {
      "use strict";

      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
      const lerp = (a, b, t) => a + (b - a) * t;
      const easeInOut = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const smoothstep = (a, b, x) => {
        const t = clamp((x - a) / (b - a));
        return t * t * (3 - 2 * t);
      };

      document.getElementById("year").textContent = new Date().getFullYear();

      /* Reveal content only when it approaches the viewport. */
      const revealItems = document.querySelectorAll(".reveal");
      if (reduceMotion || !("IntersectionObserver" in window)) {
        revealItems.forEach(item => item.classList.add("is-visible"));
      } else {
        const revealObserver = new IntersectionObserver(entries => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
              revealObserver.unobserve(entry.target);
            }
          });
        }, { rootMargin: "0px 0px -8%", threshold: .08 });
        revealItems.forEach(item => revealObserver.observe(item));
      }

      /* Lightweight 3D tilt for cards. */
      if (!reduceMotion && matchMedia("(pointer:fine)").matches) {
        document.querySelectorAll(".tilt-card").forEach(card => {
          card.addEventListener("pointermove", event => {
            const rect = card.getBoundingClientRect();
            const x = (event.clientX - rect.left) / rect.width;
            const y = (event.clientY - rect.top) / rect.height;
            card.style.setProperty("--ry", `${(x - .5) * 5.5}deg`);
            card.style.setProperty("--rx", `${(.5 - y) * 5.5}deg`);
          });
          card.addEventListener("pointerleave", () => {
            card.style.setProperty("--ry", "0deg");
            card.style.setProperty("--rx", "0deg");
          });
        });
      }

      /* Publication filtering. */
      const filterButtons = [...document.querySelectorAll(".filter-button")];
      const publications = [...document.querySelectorAll(".publication")];
      const publicationCount = document.querySelector(".publication-count");

      filterButtons.forEach(button => {
        button.addEventListener("click", () => {
          const filter = button.dataset.filter;
          filterButtons.forEach(item => item.setAttribute("aria-pressed", String(item === button)));
          let visible = 0;
          publications.forEach(publication => {
            const show = filter === "all" || publication.dataset.year === filter;
            publication.hidden = !show;
            visible += show ? 1 : 0;
          });
          publicationCount.textContent = `${visible} record${visible === 1 ? "" : "s"}`;
        });
      });

      /* Active navigation state. */
      if ("IntersectionObserver" in window) {
        const navLinks = [...document.querySelectorAll(".nav-links a")];
        const sectionMap = new Map(navLinks.map(link => [link.getAttribute("href").slice(1), link]));
        const navObserver = new IntersectionObserver(entries => {
          const active = entries
            .filter(entry => entry.isIntersecting)
            .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
          if (!active) return;
          navLinks.forEach(link => link.removeAttribute("aria-current"));
          sectionMap.get(active.target.id)?.setAttribute("aria-current", "page");
        }, { rootMargin: "-30% 0px -60%", threshold: [0, .2, .5] });
        document.querySelectorAll("main section[id]").forEach(section => navObserver.observe(section));
      }

      /* Scroll-driven hero scene copy. */
      const heroScroll = document.querySelector(".hero-scroll");
      const sceneCopies = [...document.querySelectorAll(".scene-copy")];
      let heroProgress = 0;
      let targetHeroProgress = 0;

      function updateHeroProgress() {
        const rect = heroScroll.getBoundingClientRect();
        const range = Math.max(1, rect.height - innerHeight);
        targetHeroProgress = clamp(-rect.top / range);
      }

      function sceneOpacity(progress, index) {
        if (index === 0) return 1 - smoothstep(.14, .27, progress);
        if (index === 1) return smoothstep(.18, .31, progress) * (1 - smoothstep(.43, .56, progress));
        if (index === 2) return smoothstep(.46, .59, progress) * (1 - smoothstep(.70, .82, progress));
        return smoothstep(.73, .87, progress);
      }

      function renderSceneCopy(progress) {
        const centers = [.08, .37, .64, .89];
        sceneCopies.forEach((copy, index) => {
          const opacity = sceneOpacity(progress, index);
          const direction = progress < centers[index] ? 1 : -1;
          const offset = (1 - opacity) * 42 * direction;
          copy.style.opacity = opacity.toFixed(3);
          copy.style.transform = `translate3d(0, calc(-50% + ${offset.toFixed(1)}px), 0)`;
          copy.style.pointerEvents = opacity > .65 ? "auto" : "none";
        });
      }

      addEventListener("scroll", updateHeroProgress, { passive: true });
      addEventListener("resize", updateHeroProgress, { passive: true });
      updateHeroProgress();

      /* Self-contained 3D spectral cube rendered with Canvas 2D projection. */
      class SpectralScene {
        constructor(canvas) {
          this.canvas = canvas;
          this.ctx = canvas.getContext("2d", { alpha: true });
          this.dpr = 1;
          this.width = 1;
          this.height = 1;
          this.pointerX = 0;
          this.pointerY = 0;
          this.pointerTX = 0;
          this.pointerTY = 0;
          this.time = 0;
          this.slices = 34;
          this.particles = this.createParticles(84);
          this.resize();
          addEventListener("resize", () => this.resize(), { passive: true });
          if (!reduceMotion && matchMedia("(pointer:fine)").matches) {
            addEventListener("pointermove", event => {
              this.pointerTX = event.clientX / innerWidth * 2 - 1;
              this.pointerTY = event.clientY / innerHeight * 2 - 1;
            }, { passive: true });
          }
        }

        createParticles(count) {
          const seed = value => {
            const x = Math.sin(value * 999.91) * 43758.5453;
            return x - Math.floor(x);
          };
          return Array.from({ length: count }, (_, index) => ({
            angle: seed(index + 1) * Math.PI * 2,
            radius: .82 + seed(index + 17) * 1.55,
            y: (seed(index + 43) - .5) * 2.2,
            size: .7 + seed(index + 89) * 2.1,
            speed: .08 + seed(index + 137) * .18,
            hue: 190 + seed(index + 201) * 170,
            alpha: .16 + seed(index + 271) * .5
          }));
        }

        resize() {
          const rect = this.canvas.getBoundingClientRect();
          this.dpr = Math.min(devicePixelRatio || 1, 2);
          this.width = Math.max(1, rect.width);
          this.height = Math.max(1, rect.height);
          this.canvas.width = Math.round(this.width * this.dpr);
          this.canvas.height = Math.round(this.height * this.dpr);
          this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        }

        rotate(point, rx, ry, rz) {
          let { x, y, z } = point;
          let c = Math.cos(rx), s = Math.sin(rx);
          [y, z] = [y * c - z * s, y * s + z * c];
          c = Math.cos(ry); s = Math.sin(ry);
          [x, z] = [x * c + z * s, -x * s + z * c];
          c = Math.cos(rz); s = Math.sin(rz);
          [x, y] = [x * c - y * s, x * s + y * c];
          return { x, y, z };
        }

        project(point, state) {
          const rotated = this.rotate(point, state.rx, state.ry, state.rz);
          const camera = 5.8;
          const depth = camera - rotated.z;
          const perspective = camera / depth;
          return {
            x: state.cx + rotated.x * state.scale * perspective,
            y: state.cy + rotated.y * state.scale * perspective,
            z: rotated.z,
            perspective
          };
        }

        getState(progress) {
          const mobile = this.width < 820;
          const intro = smoothstep(0, .2, progress);
          const explode = smoothstep(.22, .46, progress) * (1 - smoothstep(.64, .82, progress));
          const final = smoothstep(.72, 1, progress);
          const drift = reduceMotion ? 0 : Math.sin(this.time * .35) * .025;

          return {
            cx: mobile
              ? this.width * .57
              : lerp(this.width * .69, this.width * .72, final),
            cy: mobile
              ? lerp(this.height * .36, this.height * .31, final)
              : lerp(this.height * .50, this.height * .47, final),
            scale: Math.min(this.width, this.height) * (mobile ? lerp(.185, .23, intro) : lerp(.22, .29, intro)) * lerp(1, .92, final),
            rx: lerp(-.26, .48, progress) + this.pointerY * .08 + drift,
            ry: lerp(.62, 2.5, progress) + this.pointerX * .12,
            rz: lerp(-.09, .18, progress),
            explode,
            final,
            glow: .8 + explode * .35,
            cubeAlpha: lerp(.82, .98, intro)
          };
        }

        polygon(points, fill, stroke, lineWidth = 1) {
          const ctx = this.ctx;
          ctx.beginPath();
          ctx.moveTo(points[0].x, points[0].y);
          for (let i = 1; i < points.length; i += 1) ctx.lineTo(points[i].x, points[i].y);
          ctx.closePath();
          if (fill) {
            ctx.fillStyle = fill;
            ctx.fill();
          }
          if (stroke) {
            ctx.lineWidth = lineWidth;
            ctx.strokeStyle = stroke;
            ctx.stroke();
          }
        }

        drawGlow(state) {
          const ctx = this.ctx;
          const radius = state.scale * 2.35;
          const glow = ctx.createRadialGradient(state.cx, state.cy, 0, state.cx, state.cy, radius);
          glow.addColorStop(0, `rgba(118, 175, 255, ${.11 * state.glow})`);
          glow.addColorStop(.28, `rgba(172, 97, 255, ${.07 * state.glow})`);
          glow.addColorStop(.55, `rgba(244, 87, 195, ${.035 * state.glow})`);
          glow.addColorStop(1, "rgba(5, 5, 7, 0)");
          ctx.fillStyle = glow;
          ctx.fillRect(state.cx - radius, state.cy - radius, radius * 2, radius * 2);
        }

        drawParticles(state, progress) {
          const ctx = this.ctx;
          const items = this.particles.map((particle, index) => {
            const angle = particle.angle + this.time * particle.speed + progress * (1.8 + index % 5 * .07);
            const point = {
              x: Math.cos(angle) * particle.radius,
              y: particle.y + Math.sin(angle * 1.7) * .14,
              z: Math.sin(angle) * particle.radius
            };
            return { particle, projected: this.project(point, state) };
          }).sort((a, b) => a.projected.z - b.projected.z);

          items.forEach(({ particle, projected }) => {
            const size = particle.size * projected.perspective * (1 + state.explode * .45);
            const alpha = particle.alpha * (.45 + projected.perspective * .35) * (1 - state.final * .25);
            ctx.beginPath();
            ctx.arc(projected.x, projected.y, Math.max(.4, size), 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${particle.hue}, 95%, 76%, ${alpha})`;
            ctx.shadowBlur = size * 6;
            ctx.shadowColor = `hsla(${particle.hue}, 95%, 68%, ${alpha})`;
            ctx.fill();
          });
          ctx.shadowBlur = 0;
        }

        drawSpectralSlices(state, progress) {
          const ctx = this.ctx;
          const halfW = 1.38;
          const halfH = 1.05;
          const depth = 1.55;
          const sliceItems = [];

          for (let index = 0; index < this.slices; index += 1) {
            const t = index / (this.slices - 1);
            const baseZ = lerp(-depth / 2, depth / 2, t);
            const centered = t - .5;
            const fan = state.explode * centered * 2.25;
            const wave = state.explode * Math.sin(t * Math.PI * 3 + progress * 5) * .06;
            const z = baseZ + fan;
            const xShift = state.explode * centered * .32;
            const yShift = wave;
            const points = [
              { x: -halfW + xShift, y: -halfH + yShift, z },
              { x: halfW + xShift, y: -halfH + yShift, z },
              { x: halfW + xShift, y: halfH + yShift, z },
              { x: -halfW + xShift, y: halfH + yShift, z }
            ].map(point => this.project(point, state));
            const averageZ = points.reduce((sum, p) => sum + p.z, 0) / points.length;
            sliceItems.push({ index, t, points, averageZ });
          }

          sliceItems.sort((a, b) => a.averageZ - b.averageZ);
          ctx.globalCompositeOperation = "lighter";

          sliceItems.forEach(({ index, t, points }) => {
            const hue = 198 + t * 164 + Math.sin(progress * Math.PI) * 12;
            const frontness = .55 + (points[0].perspective - .75) * .5;
            const alpha = (.026 + state.explode * .013) * state.cubeAlpha * frontness;
            const gradient = ctx.createLinearGradient(points[0].x, points[0].y, points[2].x, points[2].y);
            gradient.addColorStop(0, `hsla(${hue}, 96%, 72%, ${alpha * 1.35})`);
            gradient.addColorStop(.5, `hsla(${hue + 28}, 96%, 64%, ${alpha})`);
            gradient.addColorStop(1, `hsla(${hue + 58}, 96%, 68%, ${alpha * .65})`);

            this.polygon(
              points,
              gradient,
              `hsla(${hue + 8}, 96%, 74%, ${.11 + state.explode * .09})`,
              index % 4 === 0 ? 1 : .55
            );
          });
          ctx.globalCompositeOperation = "source-over";
        }

        drawCubeEdges(state) {
          const ctx = this.ctx;
          const w = 1.4;
          const h = 1.07;
          const d = .79 + state.explode * 1.02;
          const vertices = [
            { x: -w, y: -h, z: -d }, { x: w, y: -h, z: -d },
            { x: w, y: h, z: -d }, { x: -w, y: h, z: -d },
            { x: -w, y: -h, z: d }, { x: w, y: -h, z: d },
            { x: w, y: h, z: d }, { x: -w, y: h, z: d }
          ].map(point => this.project(point, state));
          const edges = [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];

          edges
            .map(edge => ({ edge, z: (vertices[edge[0]].z + vertices[edge[1]].z) / 2 }))
            .sort((a, b) => a.z - b.z)
            .forEach(({ edge, z }) => {
              const a = vertices[edge[0]];
              const b = vertices[edge[1]];
              const alpha = z > 0 ? .44 : .13;
              const gradient = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
              gradient.addColorStop(0, `rgba(149, 223, 255, ${alpha})`);
              gradient.addColorStop(.52, `rgba(191, 151, 255, ${alpha * 1.15})`);
              gradient.addColorStop(1, `rgba(255, 142, 214, ${alpha})`);
              ctx.beginPath();
              ctx.moveTo(a.x, a.y);
              ctx.lineTo(b.x, b.y);
              ctx.strokeStyle = gradient;
              ctx.lineWidth = z > 0 ? 1.25 : .7;
              ctx.shadowBlur = z > 0 ? 10 : 0;
              ctx.shadowColor = "rgba(137, 205, 255, .35)";
              ctx.stroke();
            });
          ctx.shadowBlur = 0;
        }

        drawCore(state, progress) {
          const ctx = this.ctx;
          const center = this.project({ x: 0, y: 0, z: 0 }, state);
          const radius = state.scale * (.19 + state.explode * .06) * center.perspective;
          const core = ctx.createRadialGradient(center.x - radius * .25, center.y - radius * .3, 0, center.x, center.y, radius);
          core.addColorStop(0, `rgba(255,255,255,${.78 - state.explode * .24})`);
          core.addColorStop(.18, `rgba(145,235,255,${.38 + state.explode * .12})`);
          core.addColorStop(.52, `rgba(154,112,255,${.18 + state.explode * .12})`);
          core.addColorStop(1, "rgba(246,88,202,0)");
          ctx.fillStyle = core;
          ctx.globalCompositeOperation = "lighter";
          ctx.beginPath();
          ctx.arc(center.x, center.y, radius * (1 + Math.sin(this.time * 1.4 + progress * 4) * .04), 0, Math.PI * 2);
          ctx.fill();
          ctx.globalCompositeOperation = "source-over";
        }

        drawFloor(state) {
          const ctx = this.ctx;
          const floorY = state.cy + state.scale * 1.72;
          const width = state.scale * 2.4;
          const height = state.scale * .28;
          const gradient = ctx.createRadialGradient(state.cx, floorY, 0, state.cx, floorY, width);
          gradient.addColorStop(0, `rgba(103, 131, 255, ${.10 + state.explode * .025})`);
          gradient.addColorStop(.4, `rgba(203, 92, 232, ${.045 + state.explode * .02})`);
          gradient.addColorStop(1, "rgba(5,5,7,0)");
          ctx.save();
          ctx.translate(state.cx, floorY);
          ctx.scale(1, height / width);
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(0, 0, width, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        render(progress, delta) {
          this.time += delta;
          this.pointerX = lerp(this.pointerX, this.pointerTX, .045);
          this.pointerY = lerp(this.pointerY, this.pointerTY, .045);
          const ctx = this.ctx;
          ctx.clearRect(0, 0, this.width, this.height);
          const state = this.getState(progress);
          this.drawGlow(state);
          this.drawFloor(state);
          this.drawParticles(state, progress);
          this.drawSpectralSlices(state, progress);
          this.drawCore(state, progress);
          this.drawCubeEdges(state);
        }
      }

      const scene = new SpectralScene(document.getElementById("spectral-canvas"));
      let lastTime = performance.now();
      let heroVisible = true;

      if ("IntersectionObserver" in window) {
        const heroVisibilityObserver = new IntersectionObserver(entries => {
          heroVisible = entries[0]?.isIntersecting ?? true;
        }, { rootMargin: "20% 0px" });
        heroVisibilityObserver.observe(heroScroll);
      }

      function frame(now) {
        const delta = Math.min(.05, (now - lastTime) / 1000);
        lastTime = now;
        heroProgress = reduceMotion ? targetHeroProgress : lerp(heroProgress, targetHeroProgress, .075);
        renderSceneCopy(heroProgress);
        if (heroVisible && !document.hidden) scene.render(heroProgress, delta);
        requestAnimationFrame(frame);
      }

      requestAnimationFrame(frame);
    })();
