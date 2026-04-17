
import json

data_raw = [
  {
    "id": 1,
    "answer": [
      "Good morning sir/ma’am.",
      "My name is [Name].",
      "I am currently pursuing B.Tech in Computer Science and Engineering.",
      "I have a strong interest in software development and problem solving.",
      "I have worked on projects related to machine learning and web development.",
      "I am eager to start my career and contribute to your organization."
    ]
  },
  {
    "id": 2,
    "answer": [
      "Good morning.",
      "I am [Name], a final-year Computer Science student.",
      "I am passionate about coding and building real-world applications.",
      "I have experience in Python, Java, and web technologies.",
      "I enjoy learning new technologies and improving my skills.",
      "I am looking forward to working in a professional environment."
    ]
  },
  {
    "id": 3,
    "answer": [
      "Hello sir/ma’am.",
      "My name is [Name].",
      "I am currently in my final year of B.Tech in CSE.",
      "I have a keen interest in data structures and machine learning.",
      "I have completed projects that improved my analytical skills.",
      "I am excited to begin my professional journey."
    ]
  },
  {
    "id": 4,
    "answer": [
      "Good morning.",
      "I am [Name], pursuing Computer Science Engineering.",
      "I have strong knowledge in programming languages like Python and Java.",
      "I have developed projects such as web applications.",
      "I am a dedicated and hardworking individual.",
      "I am looking for an opportunity to apply my skills."
    ]
  },
  {
    "id": 5,
    "answer": [
      "Good morning sir/ma’am.",
      "My name is [Name].",
      "I am a final-year engineering student in Computer Science.",
      "I am interested in full-stack development.",
      "I have worked on projects using MERN stack.",
      "I am excited to contribute to your organization."
    ]
  },
  {
    "id": 6,
    "answer": [
      "Hello.",
      "I am [Name], pursuing B.Tech in Computer Science.",
      "I have a strong interest in artificial intelligence and data science.",
      "I have developed projects like recommendation systems.",
      "I am always eager to learn new technologies.",
      "I am looking forward to a challenging role."
    ]
  },
  {
    "id": 7,
    "answer": [
      "Good morning.",
      "My name is [Name].",
      "I am a Computer Science student with a passion for technology.",
      "I have hands-on experience in application development.",
      "I enjoy solving real-world problems.",
      "I am seeking an opportunity to grow professionally."
    ]
  },
  {
    "id": 8,
    "answer": [
      "Good morning sir/ma’am.",
      "I am [Name].",
      "I am in my final year of B.Tech in CSE.",
      "I have strong technical skills in programming and development.",
      "I have worked on multiple academic projects.",
      "I am eager to contribute and learn in your organization."
    ]
  },
  {
    "id": 9,
    "answer": [
      "Hello.",
      "My name is [Name].",
      "I am pursuing Computer Science Engineering.",
      "I have a keen interest in software development.",
      "I have built projects using modern technologies.",
      "I am motivated to start my professional career."
    ]
  },
  {
    "id": 10,
    "answer": [
      "Good morning.",
      "I am [Name], a final-year CSE student.",
      "I have strong fundamentals in programming and data structures.",
      "I have worked on projects that gave me practical exposure.",
      "I am a positive thinker and team player.",
      "I am excited to join your organization."
    ]
  },
  {
    "id": 11,
    "answer": [
      "Good morning sir/ma’am.",
      "My name is [Name].",
      "I am currently pursuing B.Tech in Computer Science.",
      "I have a strong interest in backend development and databases.",
      "I have worked on projects that improved my practical skills.",
      "I am eager to grow and contribute to your organization."
    ]
  },
  {
    "id": 12,
    "answer": [
      "Hello.",
      "I am [Name], a Computer Science Engineering student.",
      "I am passionate about building efficient applications.",
      "I have hands-on experience through academic projects.",
      "I am a quick learner with problem-solving skills.",
      "I am excited to work in a professional environment."
    ]
  },
  {
    "id": 13,
    "answer": [
      "Good morning.",
      "My name is [Name].",
      "I am in my final year of B.Tech in CSE.",
      "I have a keen interest in artificial intelligence.",
      "I have completed projects that enhanced my technical skills.",
      "I am looking forward to starting my career."
    ]
  },
  {
    "id": 14,
    "answer": [
      "Good morning sir/ma’am.",
      "I am [Name], pursuing Computer Science Engineering.",
      "I have strong programming and problem-solving skills.",
      "I have developed projects that improved my knowledge.",
      "I am a team player with good communication skills.",
      "I am eager to contribute to your company."
    ]
  },
  {
    "id": 15,
    "answer": [
      "Hello.",
      "My name is [Name].",
      "I am a final-year engineering student.",
      "I have experience in web development and machine learning.",
      "I enjoy learning and applying new technologies.",
      "I am excited to begin my professional journey."
    ]
  },
  {
    "id": 16,
    "answer": [
      "Good morning.",
      "I am [Name], currently pursuing B.Tech in CSE.",
      "I have a strong interest in software engineering.",
      "I have completed projects that strengthened my skills.",
      "I am adaptable and eager to learn.",
      "I am looking for an opportunity to grow."
    ]
  },
  {
    "id": 17,
    "answer": [
      "Good morning sir/ma’am.",
      "My name is [Name].",
      "I am a Computer Science student.",
      "I have a passion for coding and problem solving.",
      "I have worked on projects related to real-world problems.",
      "I am eager to start my career in your organization."
    ]
  },
  {
    "id": 18,
    "answer": [
      "Hello.",
      "I am [Name], pursuing B.Tech in Computer Science.",
      "I have a keen interest in data science and analytics.",
      "I have completed projects that enhanced my analytical skills.",
      "I am a quick learner and team player.",
      "I am excited to contribute to your company."
    ]
  },
  {
    "id": 19,
    "answer": [
      "Good morning.",
      "My name is [Name].",
      "I am a final-year CSE student.",
      "I have strong knowledge in programming and web technologies.",
      "I have built projects that gave me practical exposure.",
      "I am looking forward to working in your organization."
    ]
  },
  {
    "id": 20,
    "answer": [
      "Good morning sir/ma’am.",
      "I am [Name], pursuing Computer Science Engineering.",
      "I have a strong interest in full-stack development.",
      "I have worked on projects using modern technologies.",
      "I am adaptable and eager to learn.",
      "I am excited to begin my career."
    ]
  },
  {
    "id": 21,
    "answer": [
      "Hello.",
      "My name is [Name].",
      "I am a Computer Science Engineering student.",
      "I am passionate about developing innovative solutions.",
      "I have hands-on experience through projects.",
      "I am looking forward to contributing to your organization."
    ]
  },
  {
    "id": 22,
    "answer": [
      "Good morning.",
      "I am [Name], a final-year engineering student.",
      "I have strong programming and problem-solving skills.",
      "I have completed projects that enhanced my knowledge.",
      "I am a dedicated and responsible individual.",
      "I am eager to start my professional journey."
    ]
  },
  {
    "id": 23,
    "answer": [
      "Good morning sir/ma’am.",
      "My name is [Name].",
      "I am pursuing B.Tech in Computer Science.",
      "I have a strong interest in software development and AI.",
      "I have worked on projects that improved my skills.",
      "I am excited to contribute to your organization."
    ]
  },
  {
    "id": 24,
    "answer": [
      "Hello.",
      "I am [Name], a Computer Science student.",
      "I have a passion for coding and application development.",
      "I have completed projects that strengthened my skills.",
      "I am a quick learner and adaptable.",
      "I am looking forward to growing in a corporate environment."
    ]
  },
  {
    "id": 25,
    "answer": [
      "Good morning.",
      "My name is [Name].",
      "I am currently pursuing B.Tech in CSE.",
      "I have a strong foundation in programming and problem solving.",
      "I have worked on projects that gave me practical exposure.",
      "I am enthusiastic and eager to learn and grow."
    ]
  }
]

def get_title(ans_list):
    full_text = " ".join(ans_list).lower()
    if "mern" in full_text: return "MERN Stack Specialist"
    if "machine learning" in full_text or "ml" in full_text: return "ML & AI Focused"
    if "data science" in full_text: return "Data Science Aspirant"
    if "full-stack" in full_text: return "Full-Stack Developer"
    if "backend" in full_text: return "Backend Engineering Profile"
    if "software development" in full_text: return "Software Development Core"
    if "analytical" in full_text: return "Analytical Problem Solver"
    return "Standard Professional Introduction"

output = []
for item in data_raw:
    output.append({
        "id": f"si_{item['id']}",
        "category": "Self Introduction",
        "title": get_title(item['answer']),
        "question": "Tell me about yourself.",
        "ideal_answer": " ".join(item['answer']),
        "complexity": "Intermediate",
        "tags": ["Self Introduction", "Behavioral", "Career Start"]
    })

print(json.dumps(output, indent=2))
