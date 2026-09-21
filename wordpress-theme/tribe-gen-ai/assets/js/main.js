/**
 * Tribe Gen AI — front-end interactions.
 * Vanilla-JS port of the approved design's React behaviour:
 * scroll progress, cursor halo, reveal-on-scroll, service tabs,
 * architecture explorer, blog topic filter, article TOC.
 * Keyboard accessible; respects prefers-reduced-motion.
 */
(function () {
	"use strict";

	var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

	/* ---------- Scroll progress rail + nav state ---------- */
	var nav = document.querySelector(".nav");
	var rail = document.querySelector(".progress-rail");
	var railBar = rail ? rail.querySelector("i") : null;
	var railNum = rail ? rail.querySelector("span") : null;

	function onScroll() {
		var max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
		var p = (window.scrollY / max) * 100;
		if (railBar) railBar.style.height = p + "%";
		if (railNum) railNum.textContent = String(Math.round(p)).padStart(2, "0");
		if (nav) nav.classList.toggle("nav-scrolled", p > 2);
	}
	window.addEventListener("scroll", onScroll, { passive: true });
	onScroll();

	/* ---------- Cursor-follow variables (home + blog) ---------- */
	var suite = document.querySelector(".suite-home");
	var blogPage = document.querySelector(".blog-page");
	var coords = blogPage ? blogPage.querySelector(".blog-coordinates") : null;

	if (!reduceMotion && (suite || blogPage)) {
		window.addEventListener("pointermove", function (e) {
			var x = (e.clientX / window.innerWidth) * 100;
			var y = (e.clientY / window.innerHeight) * 100;
			if (suite) {
				suite.style.setProperty("--mx", x + "%");
				suite.style.setProperty("--my", y + "%");
				suite.style.setProperty("--px", String(x / 100 - 0.5));
				suite.style.setProperty("--py", String(y / 100 - 0.5));
			}
			if (blogPage) {
				blogPage.style.setProperty("--bx", x + "%");
				blogPage.style.setProperty("--by", y + "%");
				if (coords) coords.textContent = "X " + Math.round(x) + " / Y " + Math.round(y);
			}
		});
	}

	/* ---------- Reveal on scroll ---------- */
	var revealEls = document.querySelectorAll(".reveal");
	if (revealEls.length) {
		if (!reduceMotion && "IntersectionObserver" in window) {
			var observer = new IntersectionObserver(function (items) {
				items.forEach(function (item) {
					if (item.isIntersecting) item.target.classList.add("in-view");
				});
			}, { threshold: 0.12 });
			revealEls.forEach(function (el) { observer.observe(el); });
		} else {
			revealEls.forEach(function (el) { el.classList.add("in-view"); });
		}
	}

	/* ---------- Service tabs (six offers) ---------- */
	var tablist = document.querySelector(".suite-tabs");
	if (tablist) {
		var tabs = Array.prototype.slice.call(tablist.querySelectorAll("[role=tab]"));
		var panels = tabs.map(function (tab) {
			return document.getElementById(tab.getAttribute("aria-controls"));
		});

		var setActive = function (index) {
			tabs.forEach(function (tab, i) {
				tab.setAttribute("aria-selected", i === index ? "true" : "false");
				tab.tabIndex = i === index ? 0 : -1;
			});
			panels.forEach(function (panel, i) {
				if (panel) panel.hidden = i !== index;
			});
		};

		tabs.forEach(function (tab, index) {
			tab.addEventListener("click", function () { setActive(index); });
			tab.addEventListener("focus", function () { setActive(index); });
			tab.addEventListener("keydown", function (event) {
				var next = index;
				if (event.key === "ArrowDown" || event.key === "ArrowRight") next = (index + 1) % tabs.length;
				else if (event.key === "ArrowUp" || event.key === "ArrowLeft") next = (index + tabs.length - 1) % tabs.length;
				else if (event.key === "Home") next = 0;
				else if (event.key === "End") next = tabs.length - 1;
				else return;
				event.preventDefault();
				setActive(next);
				tabs[next].focus();
			});
		});
		setActive(0);
	}

	/* ---------- Architecture explorer ---------- */
	var architecture = document.querySelector(".architecture");
	if (architecture) {
		var layerButtons = Array.prototype.slice.call(architecture.querySelectorAll(
			".knowledge-row button, .brain-core, .architecture-layers button, .agent-row button, .human-layer"
		));
		var readout = architecture.querySelector(".architecture-readout");
		var readoutNumber = readout ? readout.querySelector("span") : null;
		var readoutTitle = readout ? readout.querySelector("h3") : null;
		var readoutText = readout ? readout.querySelector("p") : null;

		var setSignal = function (index) {
			layerButtons.forEach(function (button, i) {
				button.classList.toggle("active", i === index);
			});
			var current = layerButtons[index];
			if (readoutNumber) readoutNumber.textContent = String(index + 1).padStart(2, "0");
			if (readoutTitle) readoutTitle.textContent = current.getAttribute("data-title") || "";
			if (readoutText) readoutText.textContent = current.getAttribute("data-text") || "";
		};

		layerButtons.forEach(function (button, index) {
			["mouseenter", "focus", "click"].forEach(function (type) {
				button.addEventListener(type, function () { setSignal(index); });
			});
		});
		if (layerButtons.length) setSignal(0);
	}

	/* ---------- Blog topic filter ---------- */
	var filter = document.querySelector(".topic-filter");
	if (filter) {
		var filterButtons = Array.prototype.slice.call(filter.querySelectorAll("button"));
		var cards = Array.prototype.slice.call(document.querySelectorAll(".story-grid-loop .wp-block-post, .story-grid .story-card[data-category]"));

		var applyTopic = function (slug) {
			filterButtons.forEach(function (button) {
				button.classList.toggle("active", button.getAttribute("data-topic") === slug);
			});
			cards.forEach(function (card) {
				var match = slug === "all" ||
					card.classList.contains("category-" + slug) ||
					card.getAttribute("data-category") === slug;
				card.style.display = match ? "" : "none";
			});
		};

		filterButtons.forEach(function (button) {
			button.addEventListener("click", function () {
				applyTopic(button.getAttribute("data-topic") || "all");
			});
		});
	}

	/* ---------- Article: build "In this article" TOC ---------- */
	var toc = document.querySelector(".article-toc");
	var articleBody = document.querySelector(".article-body article");
	if (toc && articleBody) {
		var headings = Array.prototype.slice.call(articleBody.querySelectorAll("h2"));
		if (headings.length) {
			headings.forEach(function (heading, index) {
				if (!heading.id) heading.id = "section-" + (index + 1);
				var link = document.createElement("a");
				link.href = "#" + heading.id;
				link.textContent = heading.textContent.replace(/^\s*\d+\s*/, "");
				toc.appendChild(link);
			});
		} else if (toc.parentElement) {
			toc.parentElement.style.display = "none";
		}
	}
})();
