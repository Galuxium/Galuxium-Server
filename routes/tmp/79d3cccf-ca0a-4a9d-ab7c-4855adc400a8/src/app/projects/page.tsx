import { useUser } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import prisma from "../lib/prisma";

interface Project {
  id: number;
  name: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

interface UserResponse {
  user: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    emailAddresses: {
      emailAddress: string;
    }[];
  };
}

const ProjectsPage = () => {
  const { user } = useUser();
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    const fetchProjects = async () => {
      if (user) {
        const response = await fetch(`/api/projects?userId=${user.id}`);
        const data: Project[] = await response.json();
        setProjects(data);
      }
    };

    fetchProjects();
  }, [user]);

  return (
    <div>
      <h1>Projects</h1>
      <ul>
        {projects.map((project) => (
          <li key={project.id}>
            <h2>{project.name}</h2>
            <p>{project.description}</p>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ProjectsPage;