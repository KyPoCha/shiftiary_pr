import { HelpCircle, X } from "lucide-react";
import { useState } from "react";
import { getHelpTopic } from "../data/helpTopics";
import type { HelpTopicId } from "../types";

type ContextHelpButtonProps = {
  topicId: HelpTopicId;
};

export function ContextHelpButton({ topicId }: ContextHelpButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const topic = getHelpTopic(topicId);

  if (!topic) {
    return null;
  }

  return (
    <>
      <button
        aria-label={`Open help for ${topic.title}`}
        className="help-icon-button"
        onClick={() => setIsOpen(true)}
        title={`Help: ${topic.title}`}
        type="button"
      >
        <HelpCircle aria-hidden="true" size={17} />
      </button>

      {isOpen ? (
        <div aria-labelledby={`${topic.id}-help-title`} aria-modal="true" className="modal-backdrop" role="dialog">
          <div className="modal-panel help-modal">
            <div className="modal-header">
              <div>
                <h2 id={`${topic.id}-help-title`}>{topic.title}</h2>
              </div>
              <button
                aria-label="Close"
                className="icon-only-button"
                onClick={() => setIsOpen(false)}
                type="button"
              >
                <X aria-hidden="true" size={18} />
              </button>
            </div>

            <p className="help-summary">{topic.summary}</p>
            <HelpSection title="When to use" items={topic.whenToUse} />
            <HelpSection title="Key decisions" items={topic.keyDecisions} />
            <HelpSection title="Risk notes" items={topic.riskNotes} />
          </div>
        </div>
      ) : null}
    </>
  );
}

function HelpSection({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="help-section">
      <h3>{title}</h3>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
