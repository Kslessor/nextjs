<?php
/**
 * Title: Home — Intelligence Architecture
 * Slug: tribe-gen-ai/home-architecture
 * Categories: tribe-gen-ai
 * Description: The interactive architecture explorer — knowledge in, the shared brain, orchestration, memory, agents and human oversight.
 */
$knowledge = array(
	array( '◫', 'Products + services', 'Your catalogue, specifications and offer.' ),
	array( '◉', 'Brand voice', 'The language, values and standards that make you recognisable.' ),
	array( '◎', 'Customer knowledge', 'Needs, behaviours, questions and relationship history.' ),
	array( '◇', 'Commercial rules', 'Pricing logic, priorities, thresholds and business constraints.' ),
	array( '▦', 'Operational data', 'Availability, capacity, suppliers and live business signals.' ),
	array( '⬡', 'Policies + governance', 'The rules that keep every action safe and accountable.' ),
);
$agents = array(
	array( '✦', 'Content agent', 'Creates useful, on-brand content from shared knowledge.' ),
	array( '⌁', 'Customer agent', 'Responds with context while knowing when to hand over.' ),
	array( '⌗', 'Planning agent', 'Turns goals, constraints and signals into clear next actions.' ),
	array( '↗', 'Growth agent', 'Finds and prioritises commercial opportunities.' ),
	array( '◌', 'Operations agent', 'Coordinates repeatable work across systems and teams.' ),
	array( '▥', 'Insights agent', 'Transforms performance data into decisions and learning.' ),
);
?>
<!-- wp:html -->
<section class="system architecture reveal" id="intelligence">
	<div class="architecture-head"><div><p class="section-label">[ THE INTELLIGENCE ARCHITECTURE ]</p><h2>One connected<br /><em>intelligence.</em></h2></div><p>The Brain gives your connected tools a shared source of knowledge. Orchestration routes the work, memory keeps context, and your people set priorities and review the results. Explore each layer.</p></div>
	<div class="architecture-stage">
		<div class="architecture-flow-label"><span>KNOWLEDGE IN</span><i></i><span>ACTION + LEARNING</span></div>
		<div class="knowledge-row">
			<?php foreach ( $knowledge as $index => $node ) : ?>
			<button type="button"<?php echo 0 === $index ? ' class="active"' : ''; ?> data-title="<?php echo esc_attr( $node[1] ); ?>" data-text="<?php echo esc_attr( $node[2] ); ?>"><i><?php echo esc_html( $node[0] ); ?></i><strong><?php echo esc_html( $node[1] ); ?></strong><span>↘</span></button>
			<?php endforeach; ?>
		</div>
		<div class="architecture-connectors top-connectors" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div>
		<button type="button" class="brain-core" data-title="The shared brain" data-text="A governed knowledge foundation every agent can read from—so intelligence stays consistent, current and connected."><span class="brain-glyph">◉</span><strong>THE SHARED BRAIN</strong><small>Governed knowledge foundation</small><i></i><i></i><i></i></button>
		<div class="architecture-layers">
			<button type="button" data-title="Orchestration" data-text="Routes each task, applies logic and decides which agent, system or person acts next."><i>⌘</i><strong>ORCHESTRATION</strong><span>Routes tasks · applies logic · coordinates action</span><b>01</b></button>
			<button type="button" data-title="Memory" data-text="Retains context, outcomes and feedback so the system learns without losing the thread."><i>◫</i><strong>MEMORY</strong><span>Stores context · outcomes · feedback · learning</span><b>02</b></button>
		</div>
		<div class="architecture-connectors bottom-connectors" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div>
		<div class="agent-row">
			<?php foreach ( $agents as $node ) : ?>
			<button type="button" data-title="<?php echo esc_attr( $node[1] ); ?>" data-text="<?php echo esc_attr( $node[2] ); ?>"><i><?php echo esc_html( $node[0] ); ?></i><strong><?php echo esc_html( $node[1] ); ?></strong><span>↥</span></button>
			<?php endforeach; ?>
		</div>
		<button type="button" class="human-layer" data-title="Human oversight" data-text="People brief, review and manage the system—setting intent, judgement and accountability."><i>♙ ♙ ♙</i><strong>PEOPLE SET INTENT, REVIEW AND STAY IN CONTROL</strong><span>HUMAN OVERSIGHT</span></button>
	</div>
	<div class="architecture-readout" aria-live="polite"><span>01</span><div><small>ACTIVE LAYER</small><h3>Products + services</h3><p>Your catalogue, specifications and offer.</p></div><i class="readout-pulse"></i></div>
</section>
<!-- /wp:html -->
