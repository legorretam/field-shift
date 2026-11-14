import { cropLabel } from '../lib.js'

export default function StrategyDetail({ strategy, cropById, fit, isBest }) {
  const plan = strategy.sequence
    .map((q) => `${cropLabel(cropById[q.crop], q.crop)} (${seasonText(q.season)})`)
    .join(', then ')

  return (
    <article className="detail" aria-live="polite">
      <header className="detail-head">
        <h2 className="h1">{strategy.name}</h2>
        <p className="detail-plan">{plan}</p>
        <p className="muted">
          Match with your priorities: {fit} / 100{isBest ? ', the highest of the three' : ''}
        </p>
      </header>

      <div className="detail-main">
        <section className="why">
          <h3 className="h3">Why this option</h3>
          <p className="why-text">{strategy.why}</p>
        </section>

        <section className="evidence">
          <h3 className="h3">What the data shows</h3>
          <ul>
            {strategy.evidence.map((e, i) => (
              <li key={i}>
                <span className={`ev-source${/^USDA/i.test(e.dataset) ? ' ev-usda' : ''}`}>{e.dataset}</span>
                {e.finding}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="detail-grid">
        <ListBlock tone="good" title="Possible benefits" items={strategy.benefits} />
        <ListBlock tone="gap" title="What we don’t know yet" items={strategy.gaps} />
        <ListBlock tone="check" title="Check with a local expert" items={strategy.expert_review} />
      </div>
    </article>
  )
}

function ListBlock({ tone, title, items }) {
  if (!items?.length) return null
  return (
    <section className={`list-block tone-${tone}`}>
      <h3 className="h3">{title}</h3>
      <ul>
        {items.map((t, i) => (
          <li key={i}>{t}</li>
        ))}
      </ul>
    </section>
  )
}

// "Jun-Oct" -> "Jun–Oct"; "May-May" -> "May"
function seasonText(season) {
  const [a, b] = season.split('-')
  return a === b ? a : `${a}–${b}`
}
