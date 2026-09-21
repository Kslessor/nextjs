<?php
/**
 * Title: Home — Hero
 * Slug: tribe-gen-ai/home-hero
 * Categories: tribe-gen-ai
 * Description: Homepage navigation and hero with the sneaker artwork, cursor halo and progress rail.
 */
$img = get_template_directory_uri() . '/assets/img';
?>
<!-- wp:html -->
<a class="suite-skip" href="#work">Skip to what we do</a>
<div class="cursor-halo" aria-hidden="true"></div><div class="cursor-dot" aria-hidden="true"></div>
<div class="progress-rail" aria-hidden="true"><i></i><span>00</span></div>
<nav class="nav">
	<a class="brand" href="<?php echo esc_url( home_url( '/' ) ); ?>" aria-label="Tribe Gen AI home"><span>Tribe<br />Gen</span><b>AI</b><i></i></a>
	<div class="navlinks"><a href="#work">What we do</a><a href="#how-it-works">How it works</a><a href="<?php echo esc_url( home_url( '/your-tribe/' ) ); ?>">Your Tribe</a><a href="<?php echo esc_url( home_url( '/blog/' ) ); ?>">Thinking</a></div>
	<a class="nav-cta" href="#contact">Start with The Plan <span>↗</span></a>
</nav>
<section class="hero" id="top">
	<div class="gridlines"></div>
	<div class="hero-ghost" aria-hidden="true">MOVE<br />FASTER</div>
	<div class="scanline" aria-hidden="true"></div>
	<div class="hero-copy">
		<p class="eyebrow"><span></span> AI FOR RETAIL. HUMAN AT HEART.</p>
		<h1><span>Everyone</span><br /><span>working on</span><br /><em>what matters.</em></h1>
		<p class="intro">We get everyone in a retail business working on the things that matter — and give you a way to see whether they are.</p>
		<div class="hero-actions"><a class="button primary" href="#contact">Start with The Plan <span>↗</span></a><a class="text-link" href="#work">Explore the six offers <span>↓</span></a></div>
	</div>
	<div class="hero-art" aria-label="A futuristic sneaker heel representing speed, ingenuity and commerce">
		<div class="hud hud-a"><i></i> SHARED INTELLIGENCE</div><div class="hud hud-b">YOUR BUSINESS / CONNECTED</div>
		<div class="orbit orbit-one"></div><div class="orbit orbit-two"></div>
		<div class="data-tag tag-one">KNOWLEDGE<br /><b>BUSINESS OWNED</b></div><div class="data-tag tag-two">DELIVERY<br /><b>08 WEEKS</b></div>
		<img src="<?php echo esc_url( $img . '/ai-generated-shoe.png' ); ?>" alt="Forest green futuristic sneaker heel with a yellow sole" />
		<p class="vertical">AI, GENERATIVE / COMMERCE, INTELLIGENT</p>
	</div>
	<div class="scroll">SCROLL TO SHIFT <span>↓</span></div>
</section>
<!-- /wp:html -->
