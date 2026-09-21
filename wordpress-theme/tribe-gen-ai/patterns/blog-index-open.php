<?php
/**
 * Title: Thinking — Index Head + Topic Filter
 * Slug: tribe-gen-ai/blog-index-open
 * Categories: tribe-gen-ai
 * Description: The index heading and a topic filter built from live post categories.
 */
$categories  = get_categories( array( 'hide_empty' => true, 'number' => 8 ) );
$total_posts = (int) wp_count_posts( 'post' )->publish;
?>
<!-- wp:html -->
<div class="blog-index-head"><p class="section-label">[ THE INDEX ]</p><h2>Ideas to turn<br />possibility into <em>practice.</em></h2><p>Strategy, systems and provocations for teams making AI commercially useful.</p></div>
<div class="topic-filter" aria-label="Filter articles by topic">
	<button type="button" class="active" data-topic="all">All<span><?php echo esc_html( $total_posts ); ?></span></button>
	<?php foreach ( $categories as $category ) : if ( 'uncategorized' === $category->slug ) { continue; } ?>
	<button type="button" data-topic="<?php echo esc_attr( $category->slug ); ?>"><?php echo esc_html( $category->name ); ?><span><?php echo esc_html( $category->count ); ?></span></button>
	<?php endforeach; ?>
</div>
<!-- /wp:html -->
