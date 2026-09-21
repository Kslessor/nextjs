<?php
/**
 * Title: Home — Trusted by Leading Brands
 * Slug: tribe-gen-ai/home-logos
 * Categories: tribe-gen-ai
 * Description: Two slow opposing rows of client logos on black; pauses on hover/focus, static under reduced motion.
 */
$logos = get_template_directory_uri() . '/assets/img/logos';
$rows  = array(
	array(
		array( 'Nespresso Professional', 'nespresso-professional-light.svg' ),
		array( 'Uber Eats', 'uber-eats-dark.svg' ),
		array( 'LEGO', 'lego.svg' ),
		array( 'Pet Circle', 'pet-circle-default.svg' ),
		array( 'Freedom', 'freedom-white.svg' ),
		array( 'GHD ANZ', 'ghd-white.png' ),
	),
	array(
		array( 'Floorworld', 'floorworld-white.png' ),
		array( 'Accent Group', 'accent-group-white.png' ),
		array( 'True Alliance', 'true-alliance-white.png' ),
		array( 'Mister Minit', 'mister-minit-white.png' ),
		array( 'Viktoria & Woods', 'viktoria-woods-white.svg' ),
		array( 'Super Butcher', 'super-butcher.png' ),
	),
);
?>
<!-- wp:html -->
<section class="brand-proof reveal" aria-labelledby="brand-proof-title">
	<div class="brand-proof-head"><h2 id="brand-proof-title">Trusted by Leading Brands</h2></div>
	<div class="official-logo-rotator" role="region" tabindex="0" aria-label="Selected client brands. Focus or hover to pause the rotating logos.">
		<?php foreach ( $rows as $row_index => $row ) : ?>
		<div class="logo-track <?php echo 0 === $row_index ? 'track-forward' : 'track-reverse'; ?>">
			<?php foreach ( array( 0, 1 ) as $copy ) : ?>
			<div class="logo-group"<?php echo 1 === $copy ? ' aria-hidden="true"' : ''; ?>>
				<?php foreach ( $row as $logo ) : ?>
				<figure class="official-logo" data-brand="<?php echo esc_attr( $logo[0] ); ?>" title="<?php echo esc_attr( $logo[0] ); ?>">
					<img src="<?php echo esc_url( $logos . '/' . $logo[1] ); ?>" alt="<?php echo 0 === $copy ? esc_attr( $logo[0] . ' logo' ) : ''; ?>" loading="lazy" decoding="async" />
				</figure>
				<?php endforeach; ?>
			</div>
			<?php endforeach; ?>
		</div>
		<?php endforeach; ?>
	</div>
</section>
<section class="ticker" aria-label="Brand values"><div>STRATEGIC <i>●</i> HUMAN <i>●</i> BOLD <i>●</i> COMMERCIAL <i>●</i> INTELLIGENT <i>●</i> STRATEGIC <i>●</i> HUMAN <i>●</i> BOLD</div></section>
<!-- /wp:html -->
