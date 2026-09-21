<?php
/**
 * Title: Thinking — Manifesto + CTA + Footer
 * Slug: tribe-gen-ai/blog-closing
 * Categories: tribe-gen-ai
 * Description: Editorial position, closing call to action and footer for the Thinking hub.
 */
$home = home_url( '/' );
?>
<!-- wp:html -->
<section class="blog-manifesto"><p class="section-label">[ OUR EDITORIAL POSITION ]</p><p>Less prediction.<br /><em>More useful movement.</em></p><span>We write for the people responsible for making AI work—not just talking about it.</span></section>
<section class="blog-cta"><p class="section-label">[ KEEP MOVING ]</p><h2>Bring the next<br /><em>question.</em></h2><div><p>We turn emerging possibilities into practical next moves for retail and ecommerce teams.</p><a class="button primary" href="mailto:support@tribegenai.com">Start a conversation <span>↗</span></a></div></section>
<footer class="footer tribe-footer"><div class="brand footer-brand"><span>Tribe<br />Gen</span><b>AI</b><i></i></div><p>AI FOR RETAIL.<br />HUMAN AT HEART.</p><div><a href="<?php echo esc_url( $home ); ?>">Home ↗</a><a href="<?php echo esc_url( home_url( '/your-tribe/' ) ); ?>">Your Tribe ↗</a></div><small>© <?php echo esc_html( gmdate( 'Y' ) ); ?> TRIBE GEN AI</small></footer>
<!-- /wp:html -->
