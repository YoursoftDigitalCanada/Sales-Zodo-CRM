import { ProjectWizard } from "@/components/projects/ProjectWizard";

const ProjectCreateWizardPage = () => {
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-5 md:px-6 md:py-6">
        <div className="rounded-md border border-[rgba(15,23,42,0.08)] bg-gradient-to-r from-[#0891B2]/15 via-white to-[#14B8A6]/15 px-4 py-4">
          <h1 className="text-xl font-semibold text-[#0F172A]">New Roofing Project</h1>
          <p className="mt-1 text-sm text-[#475569]">
            Capture project scope, crew assignment, cost forecast, and schedule in one guided workflow.
          </p>
        </div>
        <ProjectWizard />
      </div>
    </div>
  );
};

export default ProjectCreateWizardPage;
