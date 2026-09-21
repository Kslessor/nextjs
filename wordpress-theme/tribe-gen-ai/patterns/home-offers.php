<?php
/**
 * Title: Home — Problem + The Six Offers
 * Slug: tribe-gen-ai/home-offers
 * Categories: tribe-gen-ai
 * Description: The problem statement and the six-service tabbed explorer.
 */
$services = array(
	array(
		'id' => '01', 'title' => 'Training', 'focus' => 'People', 'outcome' => 'A team that knows how.',
		'text' => 'Your team knows how to use AI properly, safely, and in your brand’s voice. Run as one session or a series that builds over time.',
		'fit' => 'Mixed skill levels. People already using AI without guidance.',
		'example' => 'A practical team session',
		'deliverables' => array( 'Real tasks from your team', 'Your brand voice in practice', 'Clear guidance on safe use' ),
		'short' => 'Build confidence across the team', 'cta' => 'Talk about training',
	),
	array(
		'id' => '02', 'title' => 'The Plan', 'focus' => 'Priorities', 'outcome' => 'Know what to fix first.',
		'text' => 'Your scorecard, the handful of numbers that move it, a name against each one, and a ranked list of what to fix first — sized by payback and effort.',
		'fit' => 'You know AI should help but not where to start.',
		'example' => 'Your priorities, on one scorecard',
		'deliverables' => array( 'The numbers that matter', 'A person accountable for each', 'Opportunities ranked by payback + effort' ),
		'short' => 'Choose the work that matters', 'cta' => 'Start with The Plan',
	),
	array(
		'id' => '03', 'title' => 'The Rules', 'focus' => 'Guardrails', 'outcome' => 'Clear rules. Confident people.',
		'text' => 'A written AI policy your team can actually follow. What goes in, what stays out, who signs off, what happens with customer and supplier data.',
		'fit' => 'You have people using personal accounts, or you sell into regulated or overseas markets.',
		'example' => 'An AI policy people can use',
		'deliverables' => array( 'What goes in / what stays out', 'Who reviews and signs off', 'How customer + supplier data is handled' ),
		'short' => 'Make safe working practical', 'cta' => 'Talk about The Rules',
	),
	array(
		'id' => '04', 'title' => 'The Brain', 'focus' => 'Knowledge', 'outcome' => 'One business. One shared brain.',
		'text' => 'One place your business knowledge lives — brand rules, customer profiles, priorities, what good looks like. Your connected AI reads from it. Change it once, keep everyone aligned.',
		'fit' => 'You’re rolling AI out across brands, teams or regions and want one version, not fifteen.',
		'example' => 'Your shared knowledge foundation',
		'deliverables' => array( 'Brand rules + customer profiles', 'Business priorities + quality standards', 'Connected to the AI your team uses' ),
		'short' => 'Give AI your business context', 'cta' => 'Talk about The Brain',
	),
	array(
		'id' => '05', 'title' => 'The First Tool', 'focus' => 'Delivery', 'outcome' => 'One job. Hours back.',
		'text' => 'One job that eats hours every week, done properly. Trade reporting, tech packs, campaign production, reconciliation. Built on your data, following your rules.',
		'fit' => 'There’s a task your team dreads and repeats.',
		'example' => 'A weekly trade reporting tool',
		'deliverables' => array( 'Reads your agreed business data', 'Produces the report your team needs', 'Keeps people in the review process' ),
		'short' => 'Solve one real, repetitive job', 'cta' => 'Find your first tool',
	),
	array(
		'id' => '06', 'title' => 'The Run', 'focus' => 'Continuity', 'outcome' => 'Keep it working. See the value.',
		'text' => 'We keep it working. Updates, fixes, new tools as you need them, and a view of what’s being used and what it’s saving you.',
		'fit' => 'Once anything is live.',
		'example' => 'Your monthly operating view',
		'deliverables' => array( 'Usage + time saved', 'Updates, fixes + improvements', 'The next tool, when you’re ready' ),
		'short' => 'Maintain, measure and improve', 'cta' => 'Talk about The Run',
	),
);
?>
<!-- wp:html -->
<section class="suite-problem reveal" aria-labelledby="problem-title">
	<p class="section-label">[ THE PROBLEM WE SOLVE ]</p>
	<h2 id="problem-title">AI has been adopted.<br /><em>One person at a time.</em></h2>
	<div><p>AI hasn’t failed in retail. Good people are doing good work in their own accounts, on their own rules, and none of it belongs to the business.</p><p class="problem-answer">We fix that.</p></div>
</section>
<section class="suite-offers reveal" id="work" aria-labelledby="suite-title">
	<div class="suite-section-head">
		<div><p class="section-label">[ THE SIX THINGS WE DO ]</p><h2 id="suite-title">Everything connected.<br /><em>Start where you need.</em></h2></div>
		<p>Buy one service or build a programme. The same foundations support your team, your knowledge and the tools you put to work.</p>
	</div>
	<div class="suite-explorer">
		<div class="suite-tabs" role="tablist" aria-label="Our six services" aria-orientation="vertical">
			<?php foreach ( $services as $index => $service ) : ?>
			<button type="button" role="tab" id="service-tab-<?php echo esc_attr( $service['id'] ); ?>" aria-controls="service-panel-<?php echo esc_attr( $service['id'] ); ?>" aria-selected="<?php echo 0 === $index ? 'true' : 'false'; ?>" tabindex="<?php echo 0 === $index ? '0' : '-1'; ?>"><span class="suite-tab-number"><?php echo esc_html( $service['id'] ); ?></span><span><strong><?php echo esc_html( $service['title'] ); ?></strong><small><?php echo esc_html( $service['short'] ); ?></small></span><span class="suite-tab-arrow" aria-hidden="true">↗</span></button>
			<?php endforeach; ?>
		</div>
		<div class="suite-panels">
			<?php foreach ( $services as $index => $service ) : ?>
			<section id="service-panel-<?php echo esc_attr( $service['id'] ); ?>" role="tabpanel" aria-labelledby="service-tab-<?php echo esc_attr( $service['id'] ); ?>"<?php echo 0 === $index ? '' : ' hidden'; ?> tabindex="0" class="suite-panel">
				<div class="suite-panel-kicker"><span><?php echo esc_html( $service['focus'] ); ?></span><span><?php echo esc_html( $service['id'] ); ?> / 06</span></div>
				<h3><?php echo esc_html( $service['outcome'] ); ?></h3>
				<p class="suite-description"><?php echo esc_html( $service['text'] ); ?></p>
				<div class="suite-fit"><span>When it’s right</span><p><?php echo esc_html( $service['fit'] ); ?></p></div>
				<div class="suite-deliverable"><p>Example deliverable</p><h4><?php echo esc_html( $service['example'] ); ?></h4><ul>
					<?php foreach ( $service['deliverables'] as $i => $line ) : ?>
					<li><span aria-hidden="true">0<?php echo (int) ( $i + 1 ); ?></span><?php echo esc_html( $line ); ?></li>
					<?php endforeach; ?>
				</ul></div>
				<a class="suite-panel-link" href="mailto:support@tribegenai.com?subject=<?php echo rawurlencode( 'Let’s talk about ' . $service['title'] ); ?>"><?php echo esc_html( $service['cta'] ); ?><span aria-hidden="true">↗</span></a>
			</section>
			<?php endforeach; ?>
		</div>
	</div>
	<div class="suite-foundation"><span>Shared foundations</span><p>Your knowledge. Your rules. Your business owns the asset.</p><a href="#intelligence">Explore how it connects <span aria-hidden="true">↓</span></a></div>
</section>
<!-- /wp:html -->
