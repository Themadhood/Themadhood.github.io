# Themadhood GitHub Pages Template

## What to edit
- All text + menu + link lists live in `branch_name/Assets/JSONs/*.json`.

## Branch switch
- Default: `pequot`
- Use: `?branch=media` or `?branch=codes` etc.

Example:
- `index.html?branch=pequot`
- `links.html?branch=pequot`

## Images
Put images in `branch_name/Assets/Img/` and reference them from JSON as:
- `GlobalAssets/Imgs/file.png`

## Layout
Main Repository  
├─ GlobalAssets  
│   ├─ HTML  
│   │   └─ sub htmls used in the main htmls like the header and footer  
│   ├─ CSS  
│   │   └─ each htmls desine .css  
│   ├─ JS  
│   │   └─ each htmls fnctions and behaver java scripts  
│   └─ Imgs  
│      └─ imige resorses used by all branches  
├─ branch  
│   ├─ sub branch redirects with same redirect layout  
│   │   └─ themadhood.github.io/branch/sub_branch (will redirect to that branch)  
│   ├─ branch redirects  
│   │   └─ themadhood.github.io/branch/branch_page (will redirect to this branches pages: home,links...)  
│   ├─ index.html  
│   │   └─ branch redirect that takes you to that spesific branch  
│   └─ assets  
│      ├─ Branding  
│      │   └─ (all branding files)
│      ├─ JSONs  
│      │   └─ (all JSON files used for that branches pages info)  
│      └─ other (other directory assets used such as imiges, code, and others)  
└─ page.html  



C:\Python\python.exe -m http.server 8000  
http://localhost:8000



Official public source repository for Themadhood.github.io.

This repository is published publicly to support GitHub Pages hosting.
Source code, branding, design, and site content are proprietary unless otherwise stated.
See LICENSE.txt for terms.
