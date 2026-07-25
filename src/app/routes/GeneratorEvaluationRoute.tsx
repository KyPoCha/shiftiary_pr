import { FlaskConical } from "lucide-react";
import { ContextHelpButton } from "../../features/help-center/components/ContextHelpButton";

export function GeneratorEvaluationRoute() {
  return (
    <section className="page page-placeholder">
      <div className="placeholder-help">
        <ContextHelpButton topicId="generator-evaluation" />
      </div>
      <div className="placeholder-icon">
        <FlaskConical aria-hidden="true" size={28} />
      </div>
      <h1>Generator Evaluation</h1>
    </section>
  );
}
