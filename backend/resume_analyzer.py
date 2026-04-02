import re
import os
import random

# Course Recommendations (Ported from Courses.py)
ds_course = [['Machine Learning Crash Course by Google [Free]', 'https://developers.google.com/machine-learning/crash-course'],
             ['Machine Learning A-Z by Udemy','https://www.udemy.com/course/machinelearning/'],
             ['Machine Learning by Andrew NG','https://www.coursera.org/learn/machine-learning'],
             ['Data Scientist Master Program of Simplilearn (IBM)','https://www.simplilearn.com/big-data-and-analytics/senior-data-scientist-masters-program-training'],
             ['Intro to Machine Learning with TensorFlow','https://www.udacity.com/course/intro-to-machine-learning-with-tensorflow-nanodegree--nd230']]

web_course = [['Django Crash course [Free]','https://youtu.be/e1IyzVyrLSU'],
              ['Python and Django Full Stack Web Developer Bootcamp','https://www.udemy.com/course/python-and-django-full-stack-web-developer-bootcamp'],
              ['React Crash Course [Free]','https://youtu.be/Dorf8i6lCuk'],
              ['Full Stack Web Developer by Udacity','https://www.udacity.com/course/full-stack-web-developer-nanodegree--nd0044'],
              ['Become a React Developer by Udacity','https://www.udacity.com/course/react-nanodegree--nd019']]

android_course = [['Android Development for Beginners [Free]','https://youtu.be/fis26HvvDII'],
                  ['Associate Android Developer Certification','https://grow.google/androiddev/#?modal_active=none'],
                  ['Become an Android Kotlin Developer by Udacity','https://www.udacity.com/course/android-kotlin-developer-nanodegree--nd940'],
                  ['Flutter App Development Course [Free]','https://youtu.be/rZLR5olMR64']]

ios_course = [['IOS App Development by LinkedIn','https://www.linkedin.com/learning/subscription/topics/ios'],
              ['iOS & Swift - The Complete iOS App Development Bootcamp','https://www.udemy.com/course/ios-13-app-development-bootcamp/'],
              ['Become an iOS Developer','https://www.udacity.com/course/ios-developer-nanodegree--nd003']]

uiux_course = [['Google UX Design Professional Certificate','https://www.coursera.org/professional-certificates/google-ux-design'],
               ['UI / UX Design Specialization','https://www.coursera.org/specializations/ui-ux-design'],
               ['Become a UX Designer by Udacity','https://www.udacity.com/course/ux-designer-nanodegree--nd578'],
               ['Adobe XD Tutorial [Free]','https://youtu.be/68w2VwalD5w']]

resume_videos = [ 'https://youtu.be/Tt08KmFfIYQ','https://youtu.be/y8YH0Qbu5h4', 'https://youtu.be/u75hUSShvnc']
interview_videos = ['https://youtu.be/HG68Ymazo18','https://youtu.be/BOvAAoxM4vg', 'https://youtu.be/KukmClH1KoA']

# Keyword Lists for Field Detection
DS_KEYWORDS = ['tensorflow','keras','pytorch','machine learning','deep Learning','flask','streamlit','data science','scikit-learn','pandas','numpy']
WEB_KEYWORDS = ['react', 'django', 'node jS', 'react js', 'php', 'laravel', 'magento', 'wordpress','javascript', 'angular js', 'C#', 'Asp.net', 'flask','html','css','next.js']
ANDROID_KEYWORDS = ['android','android development','flutter','kotlin','xml','kivy','java']
IOS_KEYWORDS = ['ios','ios development','swift','cocoa','cocoa touch','xcode']
UIUX_KEYWORDS = ['ux','adobe xd','figma','zeplin','balsamiq','ui','prototyping','wireframes','storyframes','adobe photoshop','photoshop','editing','illustrator','ui-ux']
CLOUD_KEYWORDS = ['aws','azure','gcp','cloud','terraform','docker','kubernetes','serverless','lambda','ec2','s3','azure devops','cloud computing']
DEVOPS_KEYWORDS = ['jenkins','docker','kubernetes','ansible','ci/cd','monitoring','prometheus','grafana','gitops','bash','linux','automation','infrastructure as code']
CYBER_KEYWORDS = ['penetration testing','soc','cryptography','firewall','network security','ethical hacking','vulnerability assessment','siem','incident response','malware analysis']

def analyze_resume_ats(resume_text, detected_skills):
    """
    Core ATS analysis engine implementing the rule-based scoring and field detection.
    """
    resume_text_upper = resume_text.upper()
    score = 0
    checklist = []

    # 1. Scoring Logic (Ported from Premium AI Resume Analyzer)
    sections = [
        ('Professional Summary/Objective', ['OBJECTIVE', 'SUMMARY', 'PROFILE'], 6),
        ('Academic Credentials', ['EDUCATION', 'QUALIFICATION', 'ACADEMIC', 'SCHOOL', 'COLLEGE'], 12),
        ('Professional Career History', ['EXPERIENCE', 'HISTORY', 'EMPLOYMENT', 'WORK EXPERIENCE'], 16),
        ('Practical Internship Experience', ['INTERNSHIP', 'TRAINEE'], 6),
        ('Technical Competencies/Skills', ['SKILLS', 'COMPETENCIES', 'TECH STACK', 'TECHNOLOGIES'], 7),
        ('Personal Profile & Hobbies', ['HOBBIES', 'INTERESTS'], 9), # Combined Hobbies (4) + Interests (5)
        ('Key Professional Achievements', ['ACHIEVEMENTS', 'AWARDS', 'HONORS'], 13),
        ('Industry Certifications', ['CERTIFICATIONS', 'CERTIFICATE', 'COURSE'], 15),
        ('Strategic Project Portfolio', ['PROJECTS', 'DEVELOPMENT'], 16)
    ]

    for name, keywords, points in sections:
        found = any(k in resume_text_upper for k in keywords)
        if found:
            score += points
            checklist.append({"item": name, "found": True, "points": points})
        else:
            checklist.append({"item": name, "found": False, "points": points})

    # 2. Field Detection & Recommendations
    reco_field = "NA"
    recommended_skills = []
    suggested_courses = []

    skills_lower = [s.lower() for s in detected_skills]
    
    if any(k in skills_lower for k in CLOUD_KEYWORDS):
        reco_field = "Cloud Engineering"
        recommended_skills = ['AWS/Azure/GCP','Terraform','Kubernetes','Cloud Security','Serverless Architecture','DevSecOps','Cloud Migration','IaC','Networking','Load Balancing']
        suggested_courses = ds_course # Fallback to DS for now as specific cloud courses weren't in snippet
    elif any(k in skills_lower for k in DEVOPS_KEYWORDS):
        reco_field = "DevOps Engineering"
        recommended_skills = ['Jenkins','CI/CD Pipelines','Ansible','GitOps','Observability','Helm','Shell Scripting','Infrastructure Monitoring','Docker Swarm','Kubernetes Admin']
        suggested_courses = ds_course
    elif any(k in skills_lower for k in CYBER_KEYWORDS):
        reco_field = "Cyber Security"
        recommended_skills = ['Ethical Hacking','Network Security','SIEM','Vulnerability Mgmt','OWASP','Digital Forensics','Incident Response','Cryptographic Protocols']
        suggested_courses = ds_course
    elif any(k in skills_lower for k in DS_KEYWORDS):
        reco_field = "Data Science"
        recommended_skills = ['Data Visualization','Predictive Analysis','Statistical Modeling','Data Mining','Clustering & Classification','Data Analytics','Quantitative Analysis','Web Scraping','ML Algorithms','Keras','Pytorch','Probability','Scikit-learn','Tensorflow',"Flask",'Streamlit']
        suggested_courses = ds_course
    elif any(k in skills_lower for k in WEB_KEYWORDS):
        reco_field = "Web Development"
        recommended_skills = ['React','Django','Node JS','React JS','php','laravel','Magento','wordpress','Javascript','Angular JS','c#','Flask','SDK']
        suggested_courses = web_course
    elif any(k in skills_lower for k in ANDROID_KEYWORDS):
        reco_field = "Android Development"
        recommended_skills = ['Android','Android development','Flutter','Kotlin','XML','Java','Kivy','GIT','SDK','SQLite']
        suggested_courses = android_course
    elif any(k in skills_lower for k in IOS_KEYWORDS):
        reco_field = "IOS Development"
        recommended_skills = ['IOS','IOS Development','Swift','Cocoa','Cocoa Touch','Xcode','Objective-C','SQLite','Plist','StoreKit',"UI-Kit",'AV Foundation','Auto-Layout']
        suggested_courses = ios_course
    elif any(k in skills_lower for k in UIUX_KEYWORDS):
        reco_field = "UI-UX Development"
        recommended_skills = ['UI','User Experience','Adobe XD','Figma','Zeplin','Balsamiq','Prototyping','Wireframes','Storyframes','Adobe Photoshop','Editing','Illustrator','After Effects','Premier Pro','Indesign','Wireframe','Solid','Grasp','User Research']
        suggested_courses = uiux_course

    # 3. Experience Level Detection
    cand_level = "Fresher"
    exp_patterns = [r'\d+\s*years?', r'\d+\+\s*years?', r'20\d{2}\s*-\s*(Present|20\d{2})']
    if any(re.search(p, resume_text, re.IGNORECASE) for p in exp_patterns):
        cand_level = "Experienced"

    return {
        "score": min(score, 100),
        "field": reco_field,
        "level": cand_level,
        "checklist": checklist,
        "recommended_skills": recommended_skills,
        "courses": suggested_courses[:4], # Limit to top 4
        "resume_video": random.choice(resume_videos),
        "interview_video": random.choice(interview_videos)
    }
