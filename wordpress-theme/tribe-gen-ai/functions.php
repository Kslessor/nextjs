<?php
/**
 * Tribe Gen AI block theme setup.
 *
 * @package tribe-gen-ai
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'TRIBE_GEN_AI_VERSION', '1.0.0' );

/**
 * Theme supports.
 */
function tribe_gen_ai_setup() {
	add_theme_support( 'title-tag' );
	add_theme_support( 'post-thumbnails' );
	add_theme_support( 'responsive-embeds' );
	add_theme_support( 'editor-styles' );
	add_editor_style( array(
		'assets/css/base.css',
		'assets/css/globals.css',
		'assets/css/suite.css',
		'assets/css/wp-bridge.css',
	) );
}
add_action( 'after_setup_theme', 'tribe_gen_ai_setup' );

/**
 * Front-end styles and interaction script.
 */
function tribe_gen_ai_assets() {
	$dir = get_template_directory_uri();

	wp_enqueue_style( 'tribe-gen-ai-base', $dir . '/assets/css/base.css', array(), TRIBE_GEN_AI_VERSION );
	wp_enqueue_style( 'tribe-gen-ai-globals', $dir . '/assets/css/globals.css', array( 'tribe-gen-ai-base' ), TRIBE_GEN_AI_VERSION );
	wp_enqueue_style( 'tribe-gen-ai-suite', $dir . '/assets/css/suite.css', array( 'tribe-gen-ai-globals' ), TRIBE_GEN_AI_VERSION );
	wp_enqueue_style( 'tribe-gen-ai-bridge', $dir . '/assets/css/wp-bridge.css', array( 'tribe-gen-ai-suite' ), TRIBE_GEN_AI_VERSION );

	wp_enqueue_script( 'tribe-gen-ai-main', $dir . '/assets/js/main.js', array(), TRIBE_GEN_AI_VERSION, array( 'in_footer' => true, 'strategy' => 'defer' ) );
}
add_action( 'wp_enqueue_scripts', 'tribe_gen_ai_assets' );

/**
 * Pattern category for all Tribe Gen AI sections.
 */
function tribe_gen_ai_pattern_categories() {
	register_block_pattern_category( 'tribe-gen-ai', array(
		'label' => __( 'Tribe Gen AI', 'tribe-gen-ai' ),
	) );
}
add_action( 'init', 'tribe_gen_ai_pattern_categories' );

/**
 * Body class per template so page-level scoping matches the design
 * (.suite-home, .blog-page, .article-page etc. live on wrappers in templates).
 */
function tribe_gen_ai_body_class( $classes ) {
	$classes[] = 'tribe-gen-ai';
	return $classes;
}
add_filter( 'body_class', 'tribe_gen_ai_body_class' );
