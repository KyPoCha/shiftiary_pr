import { BookOpenCheck } from "lucide-react";
import { Badge } from "../../../shared/components/Badge";
import { helpTopics } from "../data/helpTopics";

export function HelpCenterPage() {
  const categories = Array.from(new Set(helpTopics.map((topic) => topic.category)));

  return (
    <section className="page help-center-page">
      <header className="page-header">
        <div>
          <Badge tone="info">Internal documentation</Badge>
          <h1>Help Center</h1>
          <p>Product notes, operating guidance, and assessment rationale for the admin prototype.</p>
        </div>
      </header>

      <div className="help-hero-panel">
        <div className="placeholder-icon">
          <BookOpenCheck aria-hidden="true" size={26} />
        </div>
        <div>
          <h2>How this help model works</h2>
          <p>
            Each sensitive part of the admin has contextual help in-place, while this page gives a complete
            cross-feature reference. In production, the same structure could be powered by a CMS, docs repository,
            or role-aware support playbooks.
          </p>
        </div>
      </div>

      <div className="help-category-stack">
        {categories.map((category) => (
          <section className="help-category" key={category}>
            <div className="panel-heading">
              <div>
                <h2>{category}</h2>
                <span>{helpTopics.filter((topic) => topic.category === category).length} topics</span>
              </div>
            </div>

            <div className="help-topic-grid">
              {helpTopics
                .filter((topic) => topic.category === category)
                .map((topic) => (
                  <article className="help-topic-card" key={topic.id}>
                    <div>
                      <Badge tone={topic.category === "Task 2" ? "warning" : "info"}>{topic.category}</Badge>
                      <h3>{topic.title}</h3>
                      <p>{topic.summary}</p>
                    </div>
                    <div className="help-topic-meta">
                      <span>{topic.whenToUse.length} workflows</span>
                      <span>{topic.riskNotes.length} risk notes</span>
                    </div>
                  </article>
                ))}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}
