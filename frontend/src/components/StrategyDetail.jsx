import { cropLabel } from '../lib.js'

// "Jun-Oct" -> "Jun–Oct"; "May-May" -> "May"
function seasonText(season) {
  const [a, b] = season.split('-')
  return a === b ? a : `${a}–${b}`
}

export default function StrategyDetail({ strategy, cropById, fit, isBest }) {
  return (
    <article className="detail" aria-live="polite">
      <header className="detail-head">
        <div>
          <h2 className="h1">{strategy.name}</h2>
          <p className="detail-plan">
            {strategy.sequence.map((q, i) => (
              <span key={i}>
                {i > 0 && ', then '}
                <b>{cropLabel(cropById[q.crop], q.crop)}</b> {seasonText(q.season)}
              </span>
            ))}
          </p>
        </div>
        <div className="fit-ring" style={{ '--p': fit }} title={isBest ? 'The highest match of the three' : undefined}>
          <span>
            <b>{fit}</b>
            <small>match</small>
          </span>
        </div>
      </header>

      <div className="detail-main">
        <section>
          <h3 className="h3 muted">Why this option</h3>
          <p className="why-text">{strategy.why}</p>
        </section>

        <section className="evidence">
          <h3 className="h3 muted">What the data shows</h3>
          <ul>
            {strategy.evidence.map((e, i) => (
              <li key={i}>
                <span className={`ev-source${/^USDA/i.test(e.dataset) ? ' ev-usda' : ''}`}>{e.dataset}</span>
                <br />
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
