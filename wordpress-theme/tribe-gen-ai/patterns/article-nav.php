<?php
/**
 * Title: Article — Navigation
 * Slug: tribe-gen-ai/article-nav
 * Categories: tribe-gen-ai
 * Description: Site navigation for single articles.
 */
$home = home_url( '/' );
?>
<!-- wp:html -->
<nav class="nav article-nav"><a class="brand" href="<?php echo esc_url( $home ); ?>" aria-label="Tribe Gen AI home"><span>Tribe<br />Gen</span><b>AI</b><i></i></a><div class="navlinks"><a href="<?php echo esc_url( $home . '#work' ); ?>">What we do</a><a href="<?php echo esc_url( home_url( '/your-tribe/' ) ); ?>">Your Tribe</a><a href="<?php echo esc_url( home_url( '/blog/' ) ); ?>">Thinking</a><a href="<?php echo esc_url( home_url( '/aiforecommercebook/' ) ); ?>">The Book</a></div><a class="nav-cta" href="mailto:support@tribegenai.com">Start a conversation <span>↗</span></a></nav>
<!-- /wp:html -->
