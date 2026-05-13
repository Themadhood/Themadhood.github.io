__ErrorInfo__   = {'program':       "SiteRepoAutomation.ExportWebsiteRates",
                   'version':       "0.0.2",
                   'ErrorTab':      "Small Apps"}
__ModuleInfo__  = {"Programmer":     "Themadhood Pequot",
                   "Legal":        f"""
{__ErrorInfo__['program']} (c) 2026 THEMADHOOD Software
All rights reserved. Redistribution, modification, or reverse engineering
of this software is prohibited without explicit written permission.
Unauthorized use may result in legal action.""",
                   "Date":          "5/13/2026",
                   "Time":          "0000:00:00: 01:00:00",
                   "Update":        "Single-file site repo automation exporter for branch Rates.json files.",
                   "Info":          """
Standalone automation script.
Reads the rates DB from local JSON/TXT or optionally Google Sheets, then writes one public Rates.json per branch.
The output JSON does NOT include branch data because the file is already inside that branch folder.
"""}

#Imports
import ast
import json
import os
import re
from copy import deepcopy

from THEMADHOOD.URLsCredentals import PursonalCredentals as CREDENTALS,RatesURL


from Google_APIs import Sheets_API




###########################################################################
################################ Helpers ##################################
###########################################################################

def CleanId(record,*keys):
    for key in keys:
        value = record.get(key,"")
        if value not in (None,""):
            return str(value).strip()
    return ""


def IsBlankRecord(record):
    if not isinstance(record,dict):
        return True
    for value in record.values():
        if str(value).strip() not in ("","FALSE","None"):
            return False
    return True



def FetchSheetData():
    return Sheets_API.FetchAllFrombook(URL=RatesURL,credentials=CREDENTALS,
                                           prRt=True)


def NormalizeDatabase(data):
    db = data.get("sheets",data) if isinstance(data,dict) else {}
    output = deepcopy(db)
    output["Branches"] = [r for r in output.get("Branches",[]) if not IsBlankRecord(r)] or deepcopy(DEFAULT_BRANCHES)
    output["Rates"] = [r for r in output.get("Rates",[]) if not IsBlankRecord(r) and CleanId(r,"ID","rateId")]
    output["Tiers"] = [r for r in output.get("Tiers",[]) if not IsBlankRecord(r) and CleanId(r,"ID","tierId")] or deepcopy(DEFAULT_TIERS)
    output["Modifiers"] = [r for r in output.get("Modifiers",[]) if not IsBlankRecord(r) and CleanId(r,"modifierId","ID")] or deepcopy(DEFAULT_MODIFIERS)
    return output

def MoneyToNumber(value):
    if isinstance(value,(int,float)):
        return value
    clean = str(value).replace("$","").replace(",","").strip()
    if clean == "":
        return 0
    return float(clean)


def BoolValue(value):
    return str(value).strip().upper() in ("TRUE","YES","1","Y")


def FolderName(displayName):
    name = displayName.replace("’","").replace("'","")
    name = re.sub(r"[^A-Za-z0-9]+","",name)
    return name or "Branch"

###########################################################################
############################ Tree Resolver ################################
###########################################################################

class RateTree:
    def __init__(self,branches,rates):
        self.branches = branches
        self.rates = rates
        self.byId = {CleanId(branch,"ID","branchId"):branch for branch in branches if CleanId(branch,"ID","branchId")}
        self.children = {}
        for branch in branches:
            branchId = CleanId(branch,"ID","branchId")
            parentId = str(branch.get("parentId","")).strip()
            self.children.setdefault(parentId,[]).append(branchId)

    def ParentId(self,branchId):
        return str(self.byId.get(branchId,{}).get("parentId","")).strip()

    def Ancestors(self,branchId):
        out = []
        cur = self.ParentId(branchId)
        while cur:
            out.append(cur)
            cur = self.ParentId(cur)
        return out

    def Descendants(self,branchId):
        out = []
        todo = list(self.children.get(branchId,[]))
        while todo:
            cur = todo.pop(0)
            out.append(cur)
            todo.extend(self.children.get(cur,[]))
        return out

    def ResolvedRates(self,branchId):
        sourceBranchIds = {branchId}
        sourceBranchIds.update(self.Ancestors(branchId))
        sourceBranchIds.update(self.Descendants(branchId))
        output = []
        seen = set()
        for rate in self.rates:
            rateId = CleanId(rate,"ID","rateId")
            sourceId = str(rate.get("branchId","")).strip()
            direction = str(rate.get("inheritanceDirection","")).strip().lower()
            if not rateId or sourceId not in sourceBranchIds:
                continue
            isLocal = sourceId == branchId
            canFlowDown = sourceId in self.Ancestors(branchId) and direction in ("down","both","root","default","")
            canFlowUp = sourceId in self.Descendants(branchId) and direction in ("up","both","unique")
            if isLocal or canFlowDown or canFlowUp:
                if rateId not in seen:
                    output.append(rate)
                    seen.add(rateId)
        return output

###########################################################################
############################ Public JSON ##################################
###########################################################################

def PublicTier(tier):
    return dict(tier)


def PublicModifier(modifier):
    item = dict(modifier)
    item.pop("appliesTo",None)
    return item


def PublicRate(rate):
    item = dict(rate)
    #Remove hidden/internal fields not needed by the site.
    for key in ("ID","id","rateId","branchId","mode","inheritanceDirection"):
        item.pop(key,None)
    if "rate" in item:
        item["rate"] = MoneyToNumber(item["rate"])
    if "tierSupport" in item:
        item["tierSupport"] = BoolValue(item["tierSupport"])
    return item


def BuildBranchJson(db,branchId):
    tree = RateTree(db.get("Branches",[]),db.get("Rates",[]))
    return {
        "tiers":[PublicTier(t) for t in db.get("Tiers",[])],
        "modifiers":[PublicModifier(m) for m in db.get("Modifiers",[])],
        "rates":[PublicRate(r) for r in tree.ResolvedRates(branchId)]
    }


def ExportAll(db,rootDir):
    count = 0
    for branch in db.get("Branches",[]):
        branchId = CleanId(branch,"ID","branchId")
        if not branchId:
            continue
        branchName = FolderName(branch.get("displayName",branchId))
        jsonDir = os.path.join(rootDir,branchName,"Assets","JSONs")
        os.makedirs(jsonDir,exist_ok=True)
        path = os.path.join(jsonDir,"Rates.json")
        data = BuildBranchJson(db,branchId)
        with open(path,"w",encoding="utf-8") as file:
            json.dump(data,file,indent=4,ensure_ascii=False)
        count += 1
    return count

###########################################################################
################################ Program ##################################
###########################################################################

def Main():
    print("Themadhood Site Rates Exporter")
    data = FetchSheetData()

    rootDir = input("root directory: ").strip().strip('"')
    if not rootDir:
        print("No root directory entered. Export cancelled.")
        return
    db = NormalizeDatabase(data)
    count = ExportAll(db,rootDir)
    print(f"Export complete. Wrote {count} Rates.json files.")


if __name__ == "__main__":
    Main()
