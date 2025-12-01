// Load and display projects from backend
async function loadProjects() {
  try {
    // For local testing use: http://localhost:5000/api/projects
    // For production use your Render URL
    const response = await fetch('http://localhost:5000/api/projects');
    
    if (!response.ok) throw new Error('Failed to load projects');
    const data = await response.json();
    const projects = data.data || [];
    
    displayProjects(projects);
  } catch (error) {
    console.error('Error loading projects:', error);
    document.getElementById('projects-grid').innerHTML = 
      '<p style="color:#ff6b6b;font-size:1.1rem;text-align:center;">Error loading projects. Please try again later.</p>';
  }
}

function displayProjects(projects) {
  const grid = document.getElementById('projects-grid');
  
  if (!grid) {
    console.error('projects-grid element not found');
    return;
  }

  if (projects.length === 0) {
    grid.innerHTML = '<p style="text-align:center;color:#666;">No projects yet. Check back soon!</p>';
    return;
  }

  grid.innerHTML = projects.map(project => `
    <div class="project" style="background:var(--card-bg);padding:1.5rem;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.15);opacity:0;transform:translateY(30px);transition:all 0.6s ease;">
      
      <!-- Category Badge -->
      <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:0.8rem;">
        <span style="background:#4db8ff;color:#fff;padding:0.3rem 0.8rem;border-radius:999px;font-size:0.75rem;font-weight:700;text-transform:uppercase;">
          ${project.category || 'Project'}
        </span>
        ${project.impact ? `<span style="color:#7be495;font-size:0.85rem;font-weight:600;">⭐ ${project.impact}</span>` : ''}
      </div>

      <!-- Title -->
      <h3 style="margin:0 0 0.5rem;color:#111;font-size:1.1rem;font-weight:700;">${project.title}</h3>
      
      <!-- Description -->
      <p style="margin:0 0 0.8rem;color:#555;font-size:0.95rem;font-weight:400;line-height:1.5;">${project.description}</p>
      
      <!-- Technologies -->
      <div style="margin-bottom:1rem;">
        <strong style="color:#333;font-size:0.85rem;display:block;margin-bottom:0.4rem;">Tech Stack:</strong>
        <div style="display:flex;gap:0.4rem;flex-wrap:wrap;">
          ${(project.technologies || []).map(tech => `
            <span style="background:#e8f4ff;color:#0066cc;padding:0.25rem 0.7rem;border-radius:6px;font-size:0.8rem;font-weight:600;">
              ${tech}
            </span>
          `).join('')}
        </div>
      </div>

      <!-- Highlights -->
      ${(project.highlights && project.highlights.length > 0) ? `
        <div style="margin-bottom:1rem;">
          <strong style="color:#333;font-size:0.9rem;display:block;margin-bottom:0.4rem;">Key Features:</strong>
          <ul style="margin:0;padding-left:1.2rem;color:#555;font-weight:400;font-size:0.9rem;line-height:1.6;">
            ${project.highlights.slice(0, 3).map(h => `<li>${h}</li>`).join('')}
          </ul>
        </div>
      ` : ''}

      <!-- Links -->
      <div style="display:flex;gap:0.8rem;margin-top:1.2rem;">
        ${project.github ? `
          <a href="${project.github}" target="_blank" rel="noopener noreferrer" style="flex:1;padding:0.7rem;background:#333;color:#fff;text-decoration:none;border-radius:6px;text-align:center;font-weight:600;font-size:0.9rem;transition:0.3s;display:inline-block;" onmouseover="this.style.background='#111'" onmouseout="this.style.background='#333'">
            → GitHub Repo
          </a>
        ` : ''}
        ${project.live ? `
          <a href="${project.live}" target="_blank" rel="noopener noreferrer" style="flex:1;padding:0.7rem;background:#4db8ff;color:#fff;text-decoration:none;border-radius:6px;text-align:center;font-weight:600;font-size:0.9rem;transition:0.3s;display:inline-block;" onmouseover="this.style.background='#2d9cdb'" onmouseout="this.style.background='#4db8ff'">
            🚀 Live Demo
          </a>
        ` : ''}
      </div>
    </div>
  `).join('');

  // Animate projects on load
  setTimeout(() => {
    document.querySelectorAll('.project').forEach((el, index) => {
      setTimeout(() => {
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      }, index * 100);
    });
  }, 100);
}

// Load projects when page loads
document.addEventListener('DOMContentLoaded', loadProjects);

// Update footer years
document.getElementById('year') && (document.getElementById('year').innerText = new Date().getFullYear());
document.getElementById('year2') && (document.getElementById('year2').innerText = new Date().getFullYear());
document.getElementById('year3') && (document.getElementById('year3').innerText = new Date().getFullYear());
