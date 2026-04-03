# Themadhood


# Themadhood GitHub Pages Template

## What to edit
- All text + menu + link lists live in `Content/*.json`.
- All text + menu + link lists live in `branch_name/*.json`.

## Branch switch
- Default: `pequot`
- Use: `?branch=media` or `?branch=codes` etc.

Example:
- `index.html?branch=pequot`
- `links.html?branch=pequot`

## Images
Put images in `branch_name/Assets/Img/` and reference them from JSON as:
- `GlobalAssets/Img/file.png`

## Layout
Main Repository  
├─ GlobalAssets  
│	├─ HTML  
│	│	└─ sub htmls used in the main htmls like the header and footer  
│	├─ CSS  
│	│	└─ each htmls desine .css  
│	├─ JS  
│	│	└─ each htmls fnctions and behaver java scripts  
│	└─ Imgs  
│		└─ imige resorses used by all branches  
├─ Content  
│	└─ holds the foundation branch .jsons  
│		└─ thease are the quick jsons that where created when all my cites whent down  
│			without warrning and i needed a quick fix and wix wasnt going fast enufe  
├─ branch  
│	├─ sub branch redirects with same redirect layout  
│	│	└─ themadhood.github.io/branch/sub_branch (will redirect to that branch)  
│	├─ branch redirects  
│	│	└─ themadhood.github.io/branch/branch_page (will redirect to this branches pages: home,links...)  
│	├─ index.html  
│	│	└─ branch redirect that takes you to that spesific branch  
│	└─ the branch page.json that holds info thats used to load and put on a page  
└─ page.htmls  



C:\Python\python.exe -m http.server 8000  
http://localhost:8000



Official public source repository for Themadhood.github.io.

This repository is published publicly to support GitHub Pages hosting.
Source code, branding, design, and site content are proprietary unless otherwise stated.
See LICENSE.txt for terms.
