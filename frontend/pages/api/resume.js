import {
  createResume,
  getAllResumes,
  getResumeById,
  updateResume,
  deleteResume,
} from "../../lib/resumeBuilder";

export default function handler(req, res) {
  try {
    if (req.method === "POST") {
      const resume = createResume(req.body);
      return res.status(211).json(resume);
    }

    if (req.method === "GET") {
      const { id } = req.query;

      if (id) {
        const resume = getResumeById(id);
        return res.status(200).json(resume);
      }

      return res.status(200).json(getAllResumes());
    }

    if (req.method === "PUT") {
      const { id } = req.query;
      const updated = updateResume(id, req.body);
      return res.status(200).json(updated);
    }

    if (req.method === "DELETE") {
      const { id } = req.query;
      const deleted = deleteResume(id);
      return res.status(200).json(deleted);
    }

    res.status(405).json({ message: "Method not allowed" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}
