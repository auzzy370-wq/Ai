import type { StarterFile } from "./starters";
import type { CodingLanguage } from "@/lib/coding-languages";
import { familyKeyFromSlug } from "./coding-family-harness";

type Hint = { id: string; description: string };

type MultilangPack = {
  stub: string;
  publicRunner: string;
  hiddenRunner: string;
  extra?: StarterFile[];
  publicCmd: string;
  hiddenCmd: string;
  hints: Hint[];
};

function pyHeader() {
  return `import json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
`;
}

function pyFooter(varName = "results") {
  return `
print(json.dumps({"results": ${varName}}))
sys.exit(0 if all(r["pass"] for r in ${varName}) else 1)
`;
}

function goMod(): StarterFile {
  return { path: "go.mod", content: "module crucible\n\ngo 1.22\n", language: "go" };
}

/** Build language packs for a coding-bank family slug. */
export function multilangPackForSlug(slug: string, lang: CodingLanguage): MultilangPack | null {
  const family = familyKeyFromSlug(slug);
  if (!family) return null;
  switch (family) {
    case "two-sum-family":
      return twoSum(lang);
    case "window-family":
      return window(lang);
    case "graph-family":
      return graph(lang);
    case "dp-family":
      return dp(lang);
    case "heap-family":
      return heap(lang);
    case "interval-family":
      return interval(lang);
    case "tree-family":
      return tree(lang);
    case "string-family":
      return stringFam(lang);
    case "concurrency-family":
      return concurrency(lang);
    case "security-coding":
      return security(lang);
    case "sql-logic":
      return sqlLogic(lang);
    case "rate-limit-family":
      return rateLimit(lang);
    case "privacy-coding":
      return privacy(lang);
    case "mobile-logic":
      return mobile(lang);
    case "sre-logic":
      return sre(lang);
    case "bit-family":
      return bit(lang);
    default:
      return null;
  }
}

export function multilangStarterFiles(slug: string, lang: CodingLanguage): StarterFile[] | null {
  const pack = multilangPackForSlug(slug, lang);
  if (!pack) return null;

  const hintsFile: StarterFile = {
    path: "tests/hidden.manifest.json",
    content: JSON.stringify({ tests: pack.hints }, null, 2),
    language: "json",
  };

  if (lang === "python") {
    return [
      hintsFile,
      { path: "src/solution.py", content: pack.stub, language: "python" },
      { path: "tests/run_public.py", content: pack.publicRunner, language: "python" },
      { path: "tests/hidden_run.py", content: pack.hiddenRunner, language: "python" },
      {
        path: "tests/commands.json",
        content: JSON.stringify({ public: pack.publicCmd, hidden: pack.hiddenCmd }),
        language: "json",
      },
      ...(pack.extra ?? []),
    ];
  }

  if (lang === "go") {
    return [
      hintsFile,
      goMod(),
      { path: "solution/solution.go", content: pack.stub, language: "go" },
      { path: "tests/run_public.go", content: pack.publicRunner, language: "go" },
      { path: "tests/hidden_run.go", content: pack.hiddenRunner, language: "go" },
      {
        path: "tests/commands.json",
        content: JSON.stringify({ public: pack.publicCmd, hidden: pack.hiddenCmd }),
        language: "json",
      },
      ...(pack.extra ?? []),
    ];
  }

  if (lang === "rust") {
    return [
      hintsFile,
      rustCargoTomlFixed(),
      { path: "src/lib.rs", content: pack.stub, language: "rust" },
      { path: "tests/run_public.rs", content: pack.publicRunner, language: "rust" },
      { path: "tests/hidden_run.rs", content: pack.hiddenRunner, language: "rust" },
      {
        path: "tests/commands.json",
        content: JSON.stringify({ public: pack.publicCmd, hidden: pack.hiddenCmd }),
        language: "json",
      },
      ...(pack.extra ?? []),
    ];
  }

  if (lang === "java") {
    return [
      hintsFile,
      { path: "src/Solution.java", content: pack.stub, language: "java" },
      { path: "tests/RunPublic.java", content: pack.publicRunner, language: "java" },
      { path: "tests/HiddenRun.java", content: pack.hiddenRunner, language: "java" },
      {
        path: "tests/commands.json",
        content: JSON.stringify({ public: pack.publicCmd, hidden: pack.hiddenCmd }),
        language: "json",
      },
      ...(pack.extra ?? []),
    ];
  }

  if (lang === "javascript") {
    return [
      hintsFile,
      { path: "src/solution.js", content: pack.stub, language: "javascript" },
      { path: "tests/public.test.js", content: pack.publicRunner, language: "javascript" },
      { path: "tests/run.js", content: `import { runPublicTests } from "./public.test.js";
const results = await runPublicTests();
console.log(JSON.stringify({ results }));
process.exit(results.every((r) => r.pass) ? 0 : 1);
`, language: "javascript" },
      { path: "tests/hidden_run.js", content: pack.hiddenRunner, language: "javascript" },
      {
        path: "package.json",
        content: JSON.stringify(
          { name: slug, private: true, type: "module", scripts: { test: "node tests/run.js" } },
          null,
          2,
        ),
        language: "json",
      },
      {
        path: "tests/commands.json",
        content: JSON.stringify({ public: pack.publicCmd, hidden: pack.hiddenCmd }),
        language: "json",
      },
      ...(pack.extra ?? []),
    ];
  }

  return null;
}

export function multilangCommands(lang: CodingLanguage): { public: string; hidden: string } {
  switch (lang) {
    case "python":
      return { public: "python3 tests/run_public.py", hidden: "python3 tests/hidden_run.py" };
    case "go":
      return {
        public: "go run ./tests/run_public.go",
        hidden: "go run ./tests/hidden_run.go",
      };
    case "rust":
      return { public: "cargo run --quiet --bin run_public", hidden: "cargo run --quiet --bin hidden_run" };
    case "java":
      return {
        public: "mkdir -p out && javac -d out src/Solution.java tests/RunPublic.java && java -cp out RunPublic",
        hidden: "mkdir -p out && javac -d out src/Solution.java tests/HiddenRun.java && java -cp out HiddenRun",
      };
    case "javascript":
      return { public: "node tests/run.js", hidden: "node tests/hidden_run.js" };
    default:
      // Node 22+ strips types without a local tsx install
      return {
        public: "node --experimental-strip-types --disable-warning=ExperimentalWarning tests/run.ts",
        hidden: "node --experimental-strip-types --disable-warning=ExperimentalWarning tests/_hidden_run.ts",
      };
  }
}

// ─── family packs ─────────────────────────────────────────────

function twoSum(lang: CodingLanguage): MultilangPack {
  const hints = [
    { id: "large_n", description: "n≈8k under time (hash map)" },
    { id: "zeros", description: "Zero pairs" },
  ];
  if (lang === "python") {
    return {
      hints,
      publicCmd: multilangCommands("python").public,
      hiddenCmd: multilangCommands("python").hidden,
      stub: `from typing import List

def solve(nums: List[int], target: int) -> List[int]:
    return []
`,
      publicRunner: `${pyHeader()}from solution import solve

def same_pair(a, b):
    if len(a) != 2 or len(b) != 2: return False
    return (a[0]==b[0] and a[1]==b[1]) or (a[0]==b[1] and a[1]==b[0])

results = [
  {"name":"example_1","pass": same_pair(solve([2,7,11,15],9),[0,1])},
  {"name":"example_2","pass": same_pair(solve([3,2,4],6),[1,2])},
  {"name":"example_3","pass": same_pair(solve([3,3],6),[0,1])},
  {"name":"negatives","pass": same_pair(solve([-1,-2,-3,-4,-5],-8),[2,4])},
]
${pyFooter()}`,
      hiddenRunner: `${pyHeader()}from solution import solve

def same_pair(a, b):
    if len(a) != 2 or len(b) != 2: return False
    return (a[0]==b[0] and a[1]==b[1]) or (a[0]==b[1] and a[1]==b[0])

big = list(range(8000)); big[7998]=500000; big[7999]=-499991
results = [
  {"name":"large_n","pass": same_pair(solve(big,9),[7998,7999]),"hidden":True},
  {"name":"zeros","pass": same_pair(solve([0,4,3,0],0),[0,3]),"hidden":True},
]
${pyFooter()}`,
    };
  }
  if (lang === "go") {
    return {
      hints,
      publicCmd: multilangCommands("go").public,
      hiddenCmd: multilangCommands("go").hidden,
      stub: `package solution

func Solve(nums []int, target int) []int {
\treturn nil
}
`,
      publicRunner: goMainTwoSum(false),
      hiddenRunner: goMainTwoSum(true),
    };
  }
  if (lang === "rust") {
    return {
      hints,
      publicCmd: multilangCommands("rust").public,
      hiddenCmd: multilangCommands("rust").hidden,
      stub: `pub fn solve(nums: &[i32], target: i32) -> Vec<i32> {
    let _ = (nums, target);
    vec![]
}
`,
      publicRunner: rustEmit(
        false,
        `fn same_pair(a: &[i32], b: &[i32]) -> bool {
  if a.len()!=2||b.len()!=2{return false;}
  (a[0]==b[0]&&a[1]==b[1])||(a[0]==b[1]&&a[1]==b[0])
}
fn main(){
  let cases=[
    ("example_1", same_pair(&crucible::solve(&[2,7,11,15],9),&[0,1])),
    ("example_2", same_pair(&crucible::solve(&[3,2,4],6),&[1,2])),
    ("example_3", same_pair(&crucible::solve(&[3,3],6),&[0,1])),
    ("negatives", same_pair(&crucible::solve(&[-1,-2,-3,-4,-5],-8),&[2,4])),
  ];
  print_results(&cases, false);
}
`,
      ),
      hiddenRunner: rustEmit(
        true,
        `fn same_pair(a: &[i32], b: &[i32]) -> bool {
  if a.len()!=2||b.len()!=2{return false;}
  (a[0]==b[0]&&a[1]==b[1])||(a[0]==b[1]&&a[1]==b[0])
}
fn main(){
  let mut big: Vec<i32>=(0..8000).collect(); big[7998]=500000; big[7999]=-499991;
  let cases=[
    ("large_n", same_pair(&crucible::solve(&big,9),&[7998,7999])),
    ("zeros", same_pair(&crucible::solve(&[0,4,3,0],0),&[0,3])),
  ];
  print_results(&cases, true);
}
`,
      ),
    };
  }
  if (lang === "java") {
    return {
      hints,
      publicCmd: multilangCommands("java").public,
      hiddenCmd: multilangCommands("java").hidden,
      stub: `public class Solution {
  public static int[] solve(int[] nums, int target) {
    return new int[0];
  }
}
`,
      publicRunner: javaTwoSum(false),
      hiddenRunner: javaTwoSum(true),
    };
  }
  // javascript
  return {
    hints,
    publicCmd: multilangCommands("javascript").public,
    hiddenCmd: multilangCommands("javascript").hidden,
    stub: `/** Return indices i < j such that nums[i] + nums[j] === target. */
export function solve(nums, target) {
  return [];
}
`,
    publicRunner: `import { solve } from "../src/solution.js";
function samePair(a, b) {
  if (a.length !== 2 || b.length !== 2) return false;
  return (a[0] === b[0] && a[1] === b[1]) || (a[0] === b[1] && a[1] === b[0]);
}
export async function runPublicTests() {
  return [
    { name: "example_1", pass: samePair(solve([2, 7, 11, 15], 9), [0, 1]) },
    { name: "example_2", pass: samePair(solve([3, 2, 4], 6), [1, 2]) },
    { name: "example_3", pass: samePair(solve([3, 3], 6), [0, 1]) },
    { name: "negatives", pass: samePair(solve([-1, -2, -3, -4, -5], -8), [2, 4]) },
  ];
}
`,
    hiddenRunner: `import { solve } from "../src/solution.js";
function samePair(a, b) {
  if (a.length !== 2 || b.length !== 2) return false;
  return (a[0] === b[0] && a[1] === b[1]) || (a[0] === b[1] && a[1] === b[0]);
}
const big = Array.from({ length: 8000 }, (_, i) => i);
big[7998] = 500000; big[7999] = -499991;
const results = [
  { name: "large_n", pass: samePair(solve(big, 9), [7998, 7999]), hidden: true },
  { name: "zeros", pass: samePair(solve([0, 4, 3, 0], 0), [0, 3]), hidden: true },
];
console.log(JSON.stringify({ results }));
process.exit(results.every((r) => r.pass) ? 0 : 1);
`,
  };
}

function goMainTwoSum(hidden: boolean): string {
  if (hidden) {
    return `package main
import ("encoding/json"; "fmt"; "os"; solution "crucible/solution")
func samePair(a, b []int) bool {
  if len(a)!=2||len(b)!=2{return false}
  return (a[0]==b[0]&&a[1]==b[1])||(a[0]==b[1]&&a[1]==b[0])
}
func main(){
  big:=make([]int,8000); for i:=range big{big[i]=i}; big[7998]=500000; big[7999]=-499991
  type R struct{Name string \`json:"name"\`; Pass bool \`json:"pass"\`; Hidden bool \`json:"hidden"\`}
  results:=[]R{{"large_n",samePair(solution.Solve(big,9),[]int{7998,7999}),true},{"zeros",samePair(solution.Solve([]int{0,4,3,0},0),[]int{0,3}),true}}
  ok:=true; for _,r:=range results{if !r.Pass{ok=false}}
  b,_:=json.Marshal(map[string]any{"results":results}); fmt.Println(string(b)); if !ok{os.Exit(1)}
}
`;
  }
  return `package main
import ("encoding/json"; "fmt"; "os"; solution "crucible/solution")
func samePair(a, b []int) bool {
  if len(a)!=2||len(b)!=2{return false}
  return (a[0]==b[0]&&a[1]==b[1])||(a[0]==b[1]&&a[1]==b[0])
}
func main(){
  type R struct{Name string \`json:"name"\`; Pass bool \`json:"pass"\`}
  results:=[]R{
    {"example_1",samePair(solution.Solve([]int{2,7,11,15},9),[]int{0,1})},
    {"example_2",samePair(solution.Solve([]int{3,2,4},6),[]int{1,2})},
    {"example_3",samePair(solution.Solve([]int{3,3},6),[]int{0,1})},
    {"negatives",samePair(solution.Solve([]int{-1,-2,-3,-4,-5},-8),[]int{2,4})},
  }
  ok:=true; for _,r:=range results{if !r.Pass{ok=false}}
  b,_:=json.Marshal(map[string]any{"results":results}); fmt.Println(string(b)); if !ok{os.Exit(1)}
}
`;
}

function rustEmit(_hidden: boolean, body: string): string {
  return `fn print_results(cases: &[(&str, bool)], hidden: bool) {
  print!("{{\\"results\\":[");
  let mut ok=true;
  for (i,(name,pass)) in cases.iter().enumerate(){
    if !*pass {ok=false;}
    if i>0{print!(",");}
    if hidden {
      print!("{{\\"name\\":\\"{}\\",\\"pass\\":{},\\"hidden\\":true}}", name, pass);
    } else {
      print!("{{\\"name\\":\\"{}\\",\\"pass\\":{}}}", name, pass);
    }
  }
  println!("]}}");
  if !ok { std::process::exit(1); }
}
${body}`;
}

function javaTwoSum(hidden: boolean): string {
  if (hidden) {
    return `public class HiddenRun {
  static boolean samePair(int[] a, int[] b) {
    if (a==null||b==null||a.length!=2||b.length!=2) return false;
    return (a[0]==b[0]&&a[1]==b[1])||(a[0]==b[1]&&a[1]==b[0]);
  }
  public static void main(String[] args) {
    int[] big=new int[8000]; for(int i=0;i<8000;i++) big[i]=i; big[7998]=500000; big[7999]=-499991;
    boolean r1=samePair(Solution.solve(big,9), new int[]{7998,7999});
    boolean r2=samePair(Solution.solve(new int[]{0,4,3,0},0), new int[]{0,3});
    System.out.println("{\\"results\\":[{\\"name\\":\\"large_n\\",\\"pass\\":"+r1+",\\"hidden\\":true},{\\"name\\":\\"zeros\\",\\"pass\\":"+r2+",\\"hidden\\":true}]}");
    if(!(r1&&r2)) System.exit(1);
  }
}
`;
  }
  return `public class RunPublic {
  static boolean samePair(int[] a, int[] b) {
    if (a==null||b==null||a.length!=2||b.length!=2) return false;
    return (a[0]==b[0]&&a[1]==b[1])||(a[0]==b[1]&&a[1]==b[0]);
  }
  public static void main(String[] args) {
    boolean a=samePair(Solution.solve(new int[]{2,7,11,15},9), new int[]{0,1});
    boolean b=samePair(Solution.solve(new int[]{3,2,4},6), new int[]{1,2});
    boolean c=samePair(Solution.solve(new int[]{3,3},6), new int[]{0,1});
    boolean d=samePair(Solution.solve(new int[]{-1,-2,-3,-4,-5},-8), new int[]{2,4});
    System.out.println("{\\"results\\":[{\\"name\\":\\"example_1\\",\\"pass\\":"+a+"},{\\"name\\":\\"example_2\\",\\"pass\\":"+b+"},{\\"name\\":\\"example_3\\",\\"pass\\":"+c+"},{\\"name\\":\\"negatives\\",\\"pass\\":"+d+"}]}");
    if(!(a&&b&&c&&d)) System.exit(1);
  }
}
`;
}

/** Generic scalar/bool families — shared templates. */
function simpleFamily(
  lang: CodingLanguage,
  hints: Hint[],
  parts: {
    pyStub: string;
    pyPublic: string;
    pyHidden: string;
    goStub: string;
    goPublicBody: string;
    goHiddenBody: string;
    rustStub: string;
    rustPublicBody: string;
    rustHiddenBody: string;
    javaStub: string;
    javaPublic: string;
    javaHidden: string;
    jsStub: string;
    jsPublic: string;
    jsHidden: string;
  },
): MultilangPack {
  if (lang === "python") {
    return {
      hints,
      publicCmd: multilangCommands("python").public,
      hiddenCmd: multilangCommands("python").hidden,
      stub: parts.pyStub,
      publicRunner: `${pyHeader()}${parts.pyPublic}${pyFooter()}`,
      hiddenRunner: `${pyHeader()}${parts.pyHidden}${pyFooter()}`,
    };
  }
  if (lang === "go") {
    return {
      hints,
      publicCmd: multilangCommands("go").public,
      hiddenCmd: multilangCommands("go").hidden,
      stub: parts.goStub,
      publicRunner: `package main
import ("encoding/json"; "fmt"; "os"; solution "crucible/solution")
func main(){
${parts.goPublicBody}
}
`,
      hiddenRunner: `package main
import ("encoding/json"; "fmt"; "os"; solution "crucible/solution")
func main(){
${parts.goHiddenBody}
}
`,
    };
  }
  if (lang === "rust") {
    return {
      hints,
      publicCmd: multilangCommands("rust").public,
      hiddenCmd: multilangCommands("rust").hidden,
      stub: parts.rustStub,
      publicRunner: rustEmit(false, parts.rustPublicBody),
      hiddenRunner: rustEmit(true, parts.rustHiddenBody),
    };
  }
  if (lang === "java") {
    return {
      hints,
      publicCmd: multilangCommands("java").public,
      hiddenCmd: multilangCommands("java").hidden,
      stub: parts.javaStub,
      publicRunner: parts.javaPublic,
      hiddenRunner: parts.javaHidden,
    };
  }
  return {
    hints,
    publicCmd: multilangCommands("javascript").public,
    hiddenCmd: multilangCommands("javascript").hidden,
    stub: parts.jsStub,
    publicRunner: parts.jsPublic,
    hiddenRunner: parts.jsHidden,
  };
}

function window(lang: CodingLanguage): MultilangPack {
  return simpleFamily(lang, [
    { id: "long_s", description: "Long string sliding window" },
    { id: "single", description: "Single distinct char" },
  ], {
    pyStub: `def solve(s: str, k: int) -> int:\n    return 0\n`,
    pyPublic: `from solution import solve
results=[
 {"name":"example_1","pass": solve("eceba",2)==3},
 {"name":"example_2","pass": solve("aa",1)==2},
 {"name":"k_zero","pass": solve("abc",0)==0},
 {"name":"all_unique","pass": solve("abcdef",3)==3},
]
`,
    pyHidden: `from solution import solve
long=("ab"*5000)+("c"*100)
results=[
 {"name":"long_s","pass": solve(long,2)>=10000,"hidden":True},
 {"name":"single","pass": solve("xxxxx",1)==5,"hidden":True},
]
`,
    goStub: `package solution\nfunc Solve(s string, k int) int { return 0 }\n`,
    goPublicBody: `type R struct{Name string \`json:"name"\`; Pass bool \`json:"pass"\`}
results:=[]R{{"example_1",solution.Solve("eceba",2)==3},{"example_2",solution.Solve("aa",1)==2},{"k_zero",solution.Solve("abc",0)==0},{"all_unique",solution.Solve("abcdef",3)==3}}
ok:=true; for _,r:=range results{if !r.Pass{ok=false}}; b,_:=json.Marshal(map[string]any{"results":results}); fmt.Println(string(b)); if !ok{os.Exit(1)}`,
    goHiddenBody: `long:=""; for i:=0;i<5000;i++{long+="ab"}; for i:=0;i<100;i++{long+="c"}
type R struct{Name string \`json:"name"\`; Pass bool \`json:"pass"\`; Hidden bool \`json:"hidden"\`}
results:=[]R{{"long_s",solution.Solve(long,2)>=10000,true},{"single",solution.Solve("xxxxx",1)==5,true}}
ok:=true; for _,r:=range results{if !r.Pass{ok=false}}; b,_:=json.Marshal(map[string]any{"results":results}); fmt.Println(string(b)); if !ok{os.Exit(1)}`,
    rustStub: `pub fn solve(s: &str, k: i32) -> i32 { let _=(s,k); 0 }\n`,
    rustPublicBody: `fn main(){
  let cases=[
    ("example_1", crucible::solve("eceba",2)==3),
    ("example_2", crucible::solve("aa",1)==2),
    ("k_zero", crucible::solve("abc",0)==0),
    ("all_unique", crucible::solve("abcdef",3)==3),
  ];
  print_results(&cases, false);
}
`,
    rustHiddenBody: `fn main(){
  let long = "ab".repeat(5000) + &"c".repeat(100);
  let cases=[
    ("long_s", crucible::solve(&long,2)>=10000),
    ("single", crucible::solve("xxxxx",1)==5),
  ];
  print_results(&cases, true);
}
`,
    javaStub: `public class Solution {\n  public static int solve(String s, int k){ return 0; }\n}\n`,
    javaPublic: `public class RunPublic {
  public static void main(String[] a){
    boolean b1=Solution.solve("eceba",2)==3,b2=Solution.solve("aa",1)==2,b3=Solution.solve("abc",0)==0,b4=Solution.solve("abcdef",3)==3;
    System.out.println("{\\"results\\":[{\\"name\\":\\"example_1\\",\\"pass\\":"+b1+"},{\\"name\\":\\"example_2\\",\\"pass\\":"+b2+"},{\\"name\\":\\"k_zero\\",\\"pass\\":"+b3+"},{\\"name\\":\\"all_unique\\",\\"pass\\":"+b4+"}]}");
    if(!(b1&&b2&&b3&&b4)) System.exit(1);
  }
}
`,
    javaHidden: `public class HiddenRun {
  public static void main(String[] a){
    StringBuilder sb=new StringBuilder(); for(int i=0;i<5000;i++) sb.append("ab"); for(int i=0;i<100;i++) sb.append('c');
    boolean b1=Solution.solve(sb.toString(),2)>=10000, b2=Solution.solve("xxxxx",1)==5;
    System.out.println("{\\"results\\":[{\\"name\\":\\"long_s\\",\\"pass\\":"+b1+",\\"hidden\\":true},{\\"name\\":\\"single\\",\\"pass\\":"+b2+",\\"hidden\\":true}]}");
    if(!(b1&&b2)) System.exit(1);
  }
}
`,
    jsStub: `export function solve(s, k) { return 0; }\n`,
    jsPublic: `import { solve } from "../src/solution.js";
export async function runPublicTests() {
  return [
    { name: "example_1", pass: solve("eceba", 2) === 3 },
    { name: "example_2", pass: solve("aa", 1) === 2 },
    { name: "k_zero", pass: solve("abc", 0) === 0 },
    { name: "all_unique", pass: solve("abcdef", 3) === 3 },
  ];
}
`,
    jsHidden: `import { solve } from "../src/solution.js";
const long = "ab".repeat(5000) + "c".repeat(100);
const results = [
  { name: "long_s", pass: solve(long, 2) >= 10000, hidden: true },
  { name: "single", pass: solve("xxxxx", 1) === 5, hidden: true },
];
console.log(JSON.stringify({ results }));
process.exit(results.every((r) => r.pass) ? 0 : 1);
`,
  });
}

function graph(lang: CodingLanguage): MultilangPack {
  return simpleFamily(lang, [
    { id: "large_cycle", description: "Large cyclic graph" },
    { id: "dag", description: "DAG has no cycle" },
  ], {
    pyStub: `from typing import List\ndef solve(n: int, edges: List[List[int]]) -> bool:\n    return False\n`,
    pyPublic: `from solution import solve
results=[
 {"name":"cycle","pass": solve(2,[[0,1],[1,0]]) is True},
 {"name":"line","pass": solve(3,[[0,1],[1,2]]) is False},
 {"name":"empty","pass": solve(1,[]) is False},
 {"name":"self","pass": solve(1,[[0,0]]) is True},
]
`,
    pyHidden: `from solution import solve
edges=[[i,i+1] for i in range(2000)]+[ [2000,0] ]
results=[
 {"name":"large_cycle","pass": solve(2001,edges) is True,"hidden":True},
 {"name":"dag","pass": solve(4,[[0,1],[0,2],[1,3],[2,3]]) is False,"hidden":True},
]
`,
    goStub: `package solution\nfunc Solve(n int, edges [][]int) bool { return false }\n`,
    goPublicBody: `type R struct{Name string \`json:"name"\`; Pass bool \`json:"pass"\`}
results:=[]R{{"cycle",solution.Solve(2,[][]int{{0,1},{1,0}})},{"line",!solution.Solve(3,[][]int{{0,1},{1,2}})},{"empty",!solution.Solve(1,nil)},{"self",solution.Solve(1,[][]int{{0,0}})}}
ok:=true; for _,r:=range results{if !r.Pass{ok=false}}; b,_:=json.Marshal(map[string]any{"results":results}); fmt.Println(string(b)); if !ok{os.Exit(1)}`,
    goHiddenBody: `edges:=make([][]int,0,2001); for i:=0;i<2000;i++{edges=append(edges,[]int{i,i+1})}; edges=append(edges,[]int{2000,0})
type R struct{Name string \`json:"name"\`; Pass bool \`json:"pass"\`; Hidden bool \`json:"hidden"\`}
results:=[]R{{"large_cycle",solution.Solve(2001,edges),true},{"dag",!solution.Solve(4,[][]int{{0,1},{0,2},{1,3},{2,3}}),true}}
ok:=true; for _,r:=range results{if !r.Pass{ok=false}}; b,_:=json.Marshal(map[string]any{"results":results}); fmt.Println(string(b)); if !ok{os.Exit(1)}`,
    rustStub: `pub fn solve(n: i32, edges: &[[i32;2]]) -> bool { let _=(n,edges); false }\n`,
    rustPublicBody: `fn main(){
  let cases=[
    ("cycle", crucible::solve(2,&[[0,1],[1,0]])),
    ("line", !crucible::solve(3,&[[0,1],[1,2]])),
    ("empty", !crucible::solve(1,&[])),
    ("self", crucible::solve(1,&[[0,0]])),
  ];
  print_results(&cases,false);
}
`,
    rustHiddenBody: `fn main(){
  let mut edges=Vec::new(); for i in 0..2000 { edges.push([i,i+1]); } edges.push([2000,0]);
  let cases=[
    ("large_cycle", crucible::solve(2001,&edges)),
    ("dag", !crucible::solve(4,&[[0,1],[0,2],[1,3],[2,3]])),
  ];
  print_results(&cases,true);
}
`,
    javaStub: `public class Solution {\n  public static boolean solve(int n, int[][] edges){ return false; }\n}\n`,
    javaPublic: `public class RunPublic {
  public static void main(String[] a){
    boolean b1=Solution.solve(2,new int[][]{{0,1},{1,0}});
    boolean b2=!Solution.solve(3,new int[][]{{0,1},{1,2}});
    boolean b3=!Solution.solve(1,new int[][]{});
    boolean b4=Solution.solve(1,new int[][]{{0,0}});
    System.out.println("{\\"results\\":[{\\"name\\":\\"cycle\\",\\"pass\\":"+b1+"},{\\"name\\":\\"line\\",\\"pass\\":"+b2+"},{\\"name\\":\\"empty\\",\\"pass\\":"+b3+"},{\\"name\\":\\"self\\",\\"pass\\":"+b4+"}]}");
    if(!(b1&&b2&&b3&&b4)) System.exit(1);
  }
}
`,
    javaHidden: `public class HiddenRun {
  public static void main(String[] a){
    int[][] edges=new int[2001][2]; for(int i=0;i<2000;i++){edges[i][0]=i;edges[i][1]=i+1;} edges[2000][0]=2000;edges[2000][1]=0;
    boolean b1=Solution.solve(2001,edges); boolean b2=!Solution.solve(4,new int[][]{{0,1},{0,2},{1,3},{2,3}});
    System.out.println("{\\"results\\":[{\\"name\\":\\"large_cycle\\",\\"pass\\":"+b1+",\\"hidden\\":true},{\\"name\\":\\"dag\\",\\"pass\\":"+b2+",\\"hidden\\":true}]}");
    if(!(b1&&b2)) System.exit(1);
  }
}
`,
    jsStub: `export function solve(n, edges) { return false; }\n`,
    jsPublic: `import { solve } from "../src/solution.js";
export async function runPublicTests() {
  return [
    { name: "cycle", pass: solve(2, [[0,1],[1,0]]) === true },
    { name: "line", pass: solve(3, [[0,1],[1,2]]) === false },
    { name: "empty", pass: solve(1, []) === false },
    { name: "self", pass: solve(1, [[0,0]]) === true },
  ];
}
`,
    jsHidden: `import { solve } from "../src/solution.js";
const edges = Array.from({ length: 2000 }, (_, i) => [i, i + 1]); edges.push([2000, 0]);
const results = [
  { name: "large_cycle", pass: solve(2001, edges) === true, hidden: true },
  { name: "dag", pass: solve(4, [[0,1],[0,2],[1,3],[2,3]]) === false, hidden: true },
];
console.log(JSON.stringify({ results }));
process.exit(results.every((r) => r.pass) ? 0 : 1);
`,
  });
}

function dp(lang: CodingLanguage): MultilangPack {
  return simpleFamily(lang, [
    { id: "ambiguous", description: "Ambiguous splits" },
    { id: "long", description: "Long DP string" },
  ], {
    pyStub: `from typing import List\ndef solve(s: str, wordDict: List[str]) -> bool:\n    return False\n`,
    pyPublic: `from solution import solve
results=[
 {"name":"example_1","pass": solve("leetcode",["leet","code"]) is True},
 {"name":"example_2","pass": solve("applepenapple",["apple","pen"]) is True},
 {"name":"fail","pass": solve("catsandog",["cats","dog","sand","and","cat"]) is False},
 {"name":"empty_dict","pass": solve("a",[]) is False},
]
`,
    pyHidden: `from solution import solve
results=[
 {"name":"ambiguous","pass": solve("aaaaaaa",["aaaa","aaa"]) is True,"hidden":True},
 {"name":"long","pass": solve("a"*40,["a","aa","aaa"]) is True,"hidden":True},
]
`,
    goStub: `package solution\nfunc Solve(s string, wordDict []string) bool { return false }\n`,
    goPublicBody: `type R struct{Name string \`json:"name"\`; Pass bool \`json:"pass"\`}
results:=[]R{{"example_1",solution.Solve("leetcode",[]string{"leet","code"})},{"example_2",solution.Solve("applepenapple",[]string{"apple","pen"})},{"fail",!solution.Solve("catsandog",[]string{"cats","dog","sand","and","cat"})},{"empty_dict",!solution.Solve("a",nil)}}
ok:=true; for _,r:=range results{if !r.Pass{ok=false}}; b,_:=json.Marshal(map[string]any{"results":results}); fmt.Println(string(b)); if !ok{os.Exit(1)}`,
    goHiddenBody: `type R struct{Name string \`json:"name"\`; Pass bool \`json:"pass"\`; Hidden bool \`json:"hidden"\`}
long:=""; for i:=0;i<40;i++{long+="a"}
results:=[]R{{"ambiguous",solution.Solve("aaaaaaa",[]string{"aaaa","aaa"}),true},{"long",solution.Solve(long,[]string{"a","aa","aaa"}),true}}
ok:=true; for _,r:=range results{if !r.Pass{ok=false}}; b,_:=json.Marshal(map[string]any{"results":results}); fmt.Println(string(b)); if !ok{os.Exit(1)}`,
    rustStub: `pub fn solve(s: &str, word_dict: &[&str]) -> bool { let _=(s,word_dict); false }\n`,
    rustPublicBody: `fn main(){
  let cases=[
    ("example_1", crucible::solve("leetcode",&["leet","code"])),
    ("example_2", crucible::solve("applepenapple",&["apple","pen"])),
    ("fail", !crucible::solve("catsandog",&["cats","dog","sand","and","cat"])),
    ("empty_dict", !crucible::solve("a",&[])),
  ];
  print_results(&cases,false);
}
`,
    rustHiddenBody: `fn main(){
  let long="a".repeat(40);
  let cases=[
    ("ambiguous", crucible::solve("aaaaaaa",&["aaaa","aaa"])),
    ("long", crucible::solve(&long,&["a","aa","aaa"])),
  ];
  print_results(&cases,true);
}
`,
    javaStub: `public class Solution {\n  public static boolean solve(String s, String[] wordDict){ return false; }\n}\n`,
    javaPublic: `public class RunPublic {
  public static void main(String[] a){
    boolean b1=Solution.solve("leetcode",new String[]{"leet","code"});
    boolean b2=Solution.solve("applepenapple",new String[]{"apple","pen"});
    boolean b3=!Solution.solve("catsandog",new String[]{"cats","dog","sand","and","cat"});
    boolean b4=!Solution.solve("a",new String[]{});
    System.out.println("{\\"results\\":[{\\"name\\":\\"example_1\\",\\"pass\\":"+b1+"},{\\"name\\":\\"example_2\\",\\"pass\\":"+b2+"},{\\"name\\":\\"fail\\",\\"pass\\":"+b3+"},{\\"name\\":\\"empty_dict\\",\\"pass\\":"+b4+"}]}");
    if(!(b1&&b2&&b3&&b4)) System.exit(1);
  }
}
`,
    javaHidden: `public class HiddenRun {
  public static void main(String[] a){
    String longS="a".repeat(40);
    boolean b1=Solution.solve("aaaaaaa",new String[]{"aaaa","aaa"});
    boolean b2=Solution.solve(longS,new String[]{"a","aa","aaa"});
    System.out.println("{\\"results\\":[{\\"name\\":\\"ambiguous\\",\\"pass\\":"+b1+",\\"hidden\\":true},{\\"name\\":\\"long\\",\\"pass\\":"+b2+",\\"hidden\\":true}]}");
    if(!(b1&&b2)) System.exit(1);
  }
}
`,
    jsStub: `export function solve(s, wordDict) { return false; }\n`,
    jsPublic: `import { solve } from "../src/solution.js";
export async function runPublicTests() {
  return [
    { name: "example_1", pass: solve("leetcode", ["leet", "code"]) === true },
    { name: "example_2", pass: solve("applepenapple", ["apple", "pen"]) === true },
    { name: "fail", pass: solve("catsandog", ["cats", "dog", "sand", "and", "cat"]) === false },
    { name: "empty_dict", pass: solve("a", []) === false },
  ];
}
`,
    jsHidden: `import { solve } from "../src/solution.js";
const results = [
  { name: "ambiguous", pass: solve("aaaaaaa", ["aaaa", "aaa"]) === true, hidden: true },
  { name: "long", pass: solve("a".repeat(40), ["a", "aa", "aaa"]) === true, hidden: true },
];
console.log(JSON.stringify({ results }));
process.exit(results.every((r) => r.pass) ? 0 : 1);
`,
  });
}

function heap(lang: CodingLanguage): MultilangPack {
  return simpleFamily(lang, [
    { id: "large_n", description: "n≈2e4 top-k" },
    { id: "k1", description: "k=1" },
  ], {
    pyStub: `from typing import List\ndef solve(nums: List[int], k: int) -> List[int]:\n    return []\n`,
    pyPublic: `from solution import solve
def same_set(a,b): return sorted(a)==sorted(b)
results=[
 {"name":"example_1","pass": same_set(solve([1,1,1,2,2,3],2),[1,2])},
 {"name":"example_2","pass": same_set(solve([1],1),[1])},
 {"name":"ties_ok","pass": len(solve([4,4,5,5,6],2))==2},
]
`,
    pyHidden: `from solution import solve
nums=[i%50 for i in range(20000)]
out=solve(nums,5)
results=[
 {"name":"large_n","pass": len(out)==5,"hidden":True},
 {"name":"k1","pass": solve([7,7,7,1],1)==[7] or solve([7,7,7,1],1)[0]==7,"hidden":True},
]
`,
    goStub: `package solution\nfunc Solve(nums []int, k int) []int { return nil }\n`,
    goPublicBody: `type R struct{Name string \`json:"name"\`; Pass bool \`json:"pass"\`}
eq:=func(a,b []int) bool { if len(a)!=len(b){return false}; m:=map[int]int{}; for _,x:=range a{m[x]++}; for _,x:=range b{m[x]--; if m[x]<0{return false}}; return true }
results:=[]R{{"example_1",eq(solution.Solve([]int{1,1,1,2,2,3},2),[]int{1,2})},{"example_2",eq(solution.Solve([]int{1},1),[]int{1})},{"ties_ok",len(solution.Solve([]int{4,4,5,5,6},2))==2}}
ok:=true; for _,r:=range results{if !r.Pass{ok=false}}; b,_:=json.Marshal(map[string]any{"results":results}); fmt.Println(string(b)); if !ok{os.Exit(1)}`,
    goHiddenBody: `nums:=make([]int,20000); for i:=range nums{nums[i]=i%50}
type R struct{Name string \`json:"name"\`; Pass bool \`json:"pass"\`; Hidden bool \`json:"hidden"\`}
out:=solution.Solve(nums,5); k1:=solution.Solve([]int{7,7,7,1},1)
results:=[]R{{"large_n",len(out)==5,true},{"k1",len(k1)==1&&k1[0]==7,true}}
ok:=true; for _,r:=range results{if !r.Pass{ok=false}}; b,_:=json.Marshal(map[string]any{"results":results}); fmt.Println(string(b)); if !ok{os.Exit(1)}`,
    rustStub: `pub fn solve(nums: &[i32], k: i32) -> Vec<i32> { let _=(nums,k); vec![] }\n`,
    rustPublicBody: `fn same_set(a:&[i32],b:&[i32])->bool{let mut x=a.to_vec();let mut y=b.to_vec();x.sort();y.sort();x==y}
fn main(){
  let cases=[
    ("example_1", same_set(&crucible::solve(&[1,1,1,2,2,3],2),&[1,2])),
    ("example_2", same_set(&crucible::solve(&[1],1),&[1])),
    ("ties_ok", crucible::solve(&[4,4,5,5,6],2).len()==2),
  ];
  print_results(&cases,false);
}
`,
    rustHiddenBody: `fn main(){
  let nums:Vec<i32>=(0..20000).map(|i|(i%50) as i32).collect();
  let out=crucible::solve(&nums,5);
  let k1=crucible::solve(&[7,7,7,1],1);
  let cases=[
    ("large_n", out.len()==5),
    ("k1", k1.len()==1 && k1[0]==7),
  ];
  print_results(&cases,true);
}
`,
    javaStub: `public class Solution {\n  public static int[] solve(int[] nums, int k){ return new int[0]; }\n}\n`,
    javaPublic: `public class RunPublic {
  static boolean sameSet(int[] a,int[] b){ if(a==null||b==null||a.length!=b.length)return false; java.util.Arrays.sort(a=a.clone()); java.util.Arrays.sort(b=b.clone()); return java.util.Arrays.equals(a,b); }
  public static void main(String[] a){
    boolean b1=sameSet(Solution.solve(new int[]{1,1,1,2,2,3},2),new int[]{1,2});
    boolean b2=sameSet(Solution.solve(new int[]{1},1),new int[]{1});
    boolean b3=Solution.solve(new int[]{4,4,5,5,6},2).length==2;
    System.out.println("{\\"results\\":[{\\"name\\":\\"example_1\\",\\"pass\\":"+b1+"},{\\"name\\":\\"example_2\\",\\"pass\\":"+b2+"},{\\"name\\":\\"ties_ok\\",\\"pass\\":"+b3+"}]}");
    if(!(b1&&b2&&b3)) System.exit(1);
  }
}
`,
    javaHidden: `public class HiddenRun {
  public static void main(String[] a){
    int[] nums=new int[20000]; for(int i=0;i<nums.length;i++) nums[i]=i%50;
    int[] out=Solution.solve(nums,5); int[] k1=Solution.solve(new int[]{7,7,7,1},1);
    boolean b1=out.length==5; boolean b2=k1.length==1&&k1[0]==7;
    System.out.println("{\\"results\\":[{\\"name\\":\\"large_n\\",\\"pass\\":"+b1+",\\"hidden\\":true},{\\"name\\":\\"k1\\",\\"pass\\":"+b2+",\\"hidden\\":true}]}");
    if(!(b1&&b2)) System.exit(1);
  }
}
`,
    jsStub: `export function solve(nums, k) { return []; }\n`,
    jsPublic: `import { solve } from "../src/solution.js";
function sameSet(a,b){return [...a].sort((x,y)=>x-y).join()===[...b].sort((x,y)=>x-y).join()}
export async function runPublicTests() {
  return [
    { name: "example_1", pass: sameSet(solve([1,1,1,2,2,3], 2), [1,2]) },
    { name: "example_2", pass: sameSet(solve([1], 1), [1]) },
    { name: "ties_ok", pass: solve([4,4,5,5,6], 2).length === 2 },
  ];
}
`,
    jsHidden: `import { solve } from "../src/solution.js";
const nums = Array.from({ length: 20000 }, (_, i) => i % 50);
const out = solve(nums, 5);
const results = [
  { name: "large_n", pass: out.length === 5, hidden: true },
  { name: "k1", pass: solve([7,7,7,1], 1)[0] === 7, hidden: true },
];
console.log(JSON.stringify({ results }));
process.exit(results.every((r) => r.pass) ? 0 : 1);
`,
  });
}

function interval(lang: CodingLanguage): MultilangPack {
  return simpleFamily(lang, [
    { id: "unsorted", description: "Unsorted input" },
    { id: "nested", description: "Nested intervals" },
  ], {
    pyStub: `from typing import List\ndef solve(intervals: List[List[int]]) -> List[List[int]]:\n    return []\n`,
    pyPublic: `from solution import solve
results=[
 {"name":"example_1","pass": solve([[1,3],[2,6],[8,10],[15,18]])==[[1,6],[8,10],[15,18]]},
 {"name":"example_2","pass": solve([[1,4],[4,5]])==[[1,5]]},
 {"name":"empty","pass": solve([])==[]},
]
`,
    pyHidden: `from solution import solve
results=[
 {"name":"unsorted","pass": solve([[8,10],[1,3],[2,6]])==[[1,6],[8,10]],"hidden":True},
 {"name":"nested","pass": solve([[1,10],[2,3],[4,5]])==[[1,10]],"hidden":True},
]
`,
    goStub: `package solution\nfunc Solve(intervals [][]int) [][]int { return nil }\n`,
    goPublicBody: `eq:=func(a,b [][]int) bool { ba,_:=json.Marshal(a); bb,_:=json.Marshal(b); return string(ba)==string(bb) }
type R struct{Name string \`json:"name"\`; Pass bool \`json:"pass"\`}
results:=[]R{{"example_1",eq(solution.Solve([][]int{{1,3},{2,6},{8,10},{15,18}}),[][]int{{1,6},{8,10},{15,18}})},{"example_2",eq(solution.Solve([][]int{{1,4},{4,5}}),[][]int{{1,5}})},{"empty",eq(solution.Solve(nil),nil)||eq(solution.Solve(nil),[][]int{})}}
ok:=true; for _,r:=range results{if !r.Pass{ok=false}}; b,_:=json.Marshal(map[string]any{"results":results}); fmt.Println(string(b)); if !ok{os.Exit(1)}`,
    goHiddenBody: `eq:=func(a,b [][]int) bool { ba,_:=json.Marshal(a); bb,_:=json.Marshal(b); return string(ba)==string(bb) }
type R struct{Name string \`json:"name"\`; Pass bool \`json:"pass"\`; Hidden bool \`json:"hidden"\`}
results:=[]R{{"unsorted",eq(solution.Solve([][]int{{8,10},{1,3},{2,6}}),[][]int{{1,6},{8,10}}),true},{"nested",eq(solution.Solve([][]int{{1,10},{2,3},{4,5}}),[][]int{{1,10}}),true}}
ok:=true; for _,r:=range results{if !r.Pass{ok=false}}; b,_:=json.Marshal(map[string]any{"results":results}); fmt.Println(string(b)); if !ok{os.Exit(1)}`,
    rustStub: `pub fn solve(intervals: &[[i32;2]]) -> Vec<[i32;2]> { let _=intervals; vec![] }\n`,
    rustPublicBody: `fn main(){
  let cases=[
    ("example_1", crucible::solve(&[[1,3],[2,6],[8,10],[15,18]])==vec![[1,6],[8,10],[15,18]]),
    ("example_2", crucible::solve(&[[1,4],[4,5]])==vec![[1,5]]),
    ("empty", crucible::solve(&[])==vec![]),
  ];
  print_results(&cases,false);
}
`,
    rustHiddenBody: `fn main(){
  let cases=[
    ("unsorted", crucible::solve(&[[8,10],[1,3],[2,6]])==vec![[1,6],[8,10]]),
    ("nested", crucible::solve(&[[1,10],[2,3],[4,5]])==vec![[1,10]]),
  ];
  print_results(&cases,true);
}
`,
    javaStub: `public class Solution {\n  public static int[][] solve(int[][] intervals){ return new int[0][0]; }\n}\n`,
    javaPublic: `public class RunPublic {
  static boolean eq(int[][] a,int[][] b){ return java.util.Arrays.deepEquals(a,b); }
  public static void main(String[] a){
    boolean b1=eq(Solution.solve(new int[][]{{1,3},{2,6},{8,10},{15,18}}),new int[][]{{1,6},{8,10},{15,18}});
    boolean b2=eq(Solution.solve(new int[][]{{1,4},{4,5}}),new int[][]{{1,5}});
    boolean b3=eq(Solution.solve(new int[][]{}),new int[][]{});
    System.out.println("{\\"results\\":[{\\"name\\":\\"example_1\\",\\"pass\\":"+b1+"},{\\"name\\":\\"example_2\\",\\"pass\\":"+b2+"},{\\"name\\":\\"empty\\",\\"pass\\":"+b3+"}]}");
    if(!(b1&&b2&&b3)) System.exit(1);
  }
}
`,
    javaHidden: `public class HiddenRun {
  static boolean eq(int[][] a,int[][] b){ return java.util.Arrays.deepEquals(a,b); }
  public static void main(String[] a){
    boolean b1=eq(Solution.solve(new int[][]{{8,10},{1,3},{2,6}}),new int[][]{{1,6},{8,10}});
    boolean b2=eq(Solution.solve(new int[][]{{1,10},{2,3},{4,5}}),new int[][]{{1,10}});
    System.out.println("{\\"results\\":[{\\"name\\":\\"unsorted\\",\\"pass\\":"+b1+",\\"hidden\\":true},{\\"name\\":\\"nested\\",\\"pass\\":"+b2+",\\"hidden\\":true}]}");
    if(!(b1&&b2)) System.exit(1);
  }
}
`,
    jsStub: `export function solve(intervals) { return []; }\n`,
    jsPublic: `import { solve } from "../src/solution.js";
function eq(a,b){return JSON.stringify(a)===JSON.stringify(b)}
export async function runPublicTests() {
  return [
    { name: "example_1", pass: eq(solve([[1,3],[2,6],[8,10],[15,18]]), [[1,6],[8,10],[15,18]]) },
    { name: "example_2", pass: eq(solve([[1,4],[4,5]]), [[1,5]]) },
    { name: "empty", pass: eq(solve([]), []) },
  ];
}
`,
    jsHidden: `import { solve } from "../src/solution.js";
function eq(a,b){return JSON.stringify(a)===JSON.stringify(b)}
const results = [
  { name: "unsorted", pass: eq(solve([[8,10],[1,3],[2,6]]), [[1,6],[8,10]]), hidden: true },
  { name: "nested", pass: eq(solve([[1,10],[2,3],[4,5]]), [[1,10]]), hidden: true },
];
console.log(JSON.stringify({ results }));
process.exit(results.every((r) => r.pass) ? 0 : 1);
`,
  });
}

function stringFam(lang: CodingLanguage): MultilangPack {
  return simpleFamily(lang, [
    { id: "deep", description: "Deep nesting" },
    { id: "mismatch", description: "Interleaved mismatch" },
  ], {
    pyStub: `def solve(s: str) -> bool:\n    return False\n`,
    pyPublic: `from solution import solve
results=[
 {"name":"example_1","pass": solve("()") is True},
 {"name":"example_2","pass": solve("()[]{}") is True},
 {"name":"example_3","pass": solve("(]") is False},
 {"name":"nested","pass": solve("{[]}") is True},
]
`,
    pyHidden: `from solution import solve
results=[
 {"name":"deep","pass": solve("("*500+")"*500) is True,"hidden":True},
 {"name":"mismatch","pass": solve("([)]") is False,"hidden":True},
]
`,
    goStub: `package solution\nfunc Solve(s string) bool { return false }\n`,
    goPublicBody: `type R struct{Name string \`json:"name"\`; Pass bool \`json:"pass"\`}
results:=[]R{{"example_1",solution.Solve("()")},{"example_2",solution.Solve("()[]{}")},{"example_3",!solution.Solve("(]")},{"nested",solution.Solve("{[]}")}}
ok:=true; for _,r:=range results{if !r.Pass{ok=false}}; b,_:=json.Marshal(map[string]any{"results":results}); fmt.Println(string(b)); if !ok{os.Exit(1)}`,
    goHiddenBody: `deep:=""; for i:=0;i<500;i++{deep+="("}; for i:=0;i<500;i++{deep+=")"}
type R struct{Name string \`json:"name"\`; Pass bool \`json:"pass"\`; Hidden bool \`json:"hidden"\`}
results:=[]R{{"deep",solution.Solve(deep),true},{"mismatch",!solution.Solve("([)]"),true}}
ok:=true; for _,r:=range results{if !r.Pass{ok=false}}; b,_:=json.Marshal(map[string]any{"results":results}); fmt.Println(string(b)); if !ok{os.Exit(1)}`,
    rustStub: `pub fn solve(s: &str) -> bool { let _=s; false }\n`,
    rustPublicBody: `fn main(){
  let cases=[("example_1",crucible::solve("()")),("example_2",crucible::solve("()[]{}")),("example_3",!crucible::solve("(]")),("nested",crucible::solve("{[]}"))];
  print_results(&cases,false);
}
`,
    rustHiddenBody: `fn main(){
  let deep="(".repeat(500)+&")".repeat(500);
  let cases=[("deep",crucible::solve(&deep)),("mismatch",!crucible::solve("([)]"))];
  print_results(&cases,true);
}
`,
    javaStub: `public class Solution {\n  public static boolean solve(String s){ return false; }\n}\n`,
    javaPublic: `public class RunPublic {
  public static void main(String[] a){
    boolean b1=Solution.solve("()"),b2=Solution.solve("()[]{}"),b3=!Solution.solve("(]"),b4=Solution.solve("{[]}");
    System.out.println("{\\"results\\":[{\\"name\\":\\"example_1\\",\\"pass\\":"+b1+"},{\\"name\\":\\"example_2\\",\\"pass\\":"+b2+"},{\\"name\\":\\"example_3\\",\\"pass\\":"+b3+"},{\\"name\\":\\"nested\\",\\"pass\\":"+b4+"}]}");
    if(!(b1&&b2&&b3&&b4)) System.exit(1);
  }
}
`,
    javaHidden: `public class HiddenRun {
  public static void main(String[] a){
    String deep="(".repeat(500)+")".repeat(500);
    boolean b1=Solution.solve(deep), b2=!Solution.solve("([)]");
    System.out.println("{\\"results\\":[{\\"name\\":\\"deep\\",\\"pass\\":"+b1+",\\"hidden\\":true},{\\"name\\":\\"mismatch\\",\\"pass\\":"+b2+",\\"hidden\\":true}]}");
    if(!(b1&&b2)) System.exit(1);
  }
}
`,
    jsStub: `export function solve(s) { return false; }\n`,
    jsPublic: `import { solve } from "../src/solution.js";
export async function runPublicTests() {
  return [
    { name: "example_1", pass: solve("()") === true },
    { name: "example_2", pass: solve("()[]{}") === true },
    { name: "example_3", pass: solve("(]") === false },
    { name: "nested", pass: solve("{[]}") === true },
  ];
}
`,
    jsHidden: `import { solve } from "../src/solution.js";
const results = [
  { name: "deep", pass: solve("(".repeat(500) + ")".repeat(500)) === true, hidden: true },
  { name: "mismatch", pass: solve("([)]") === false, hidden: true },
];
console.log(JSON.stringify({ results }));
process.exit(results.every((r) => r.pass) ? 0 : 1);
`,
  });
}

function security(lang: CodingLanguage): MultilangPack {
  return simpleFamily(lang, [
    { id: "prefix", description: "Prefix mismatch" },
    { id: "long", description: "Long equal secrets" },
  ], {
    pyStub: `def solve(a: str, b: str) -> bool:\n    return False\n`,
    pyPublic: `from solution import solve
results=[
 {"name":"equal","pass": solve("secret","secret") is True},
 {"name":"diff","pass": solve("secret","secreX") is False},
 {"name":"len","pass": solve("ab","abc") is False},
 {"name":"empty","pass": solve("","") is True},
]
`,
    pyHidden: `from solution import solve
results=[
 {"name":"prefix","pass": solve("aaaa","aaab") is False,"hidden":True},
 {"name":"long","pass": solve("x"*1000,"x"*1000) is True,"hidden":True},
]
`,
    goStub: `package solution\nfunc Solve(a, b string) bool { return false }\n`,
    goPublicBody: `type R struct{Name string \`json:"name"\`; Pass bool \`json:"pass"\`}
results:=[]R{{"equal",solution.Solve("secret","secret")},{"diff",!solution.Solve("secret","secreX")},{"len",!solution.Solve("ab","abc")},{"empty",solution.Solve("","")}}
ok:=true; for _,r:=range results{if !r.Pass{ok=false}}; b,_:=json.Marshal(map[string]any{"results":results}); fmt.Println(string(b)); if !ok{os.Exit(1)}`,
    goHiddenBody: `xs:=""; for i:=0;i<1000;i++{xs+="x"}
type R struct{Name string \`json:"name"\`; Pass bool \`json:"pass"\`; Hidden bool \`json:"hidden"\`}
results:=[]R{{"prefix",!solution.Solve("aaaa","aaab"),true},{"long",solution.Solve(xs,xs),true}}
ok:=true; for _,r:=range results{if !r.Pass{ok=false}}; b,_:=json.Marshal(map[string]any{"results":results}); fmt.Println(string(b)); if !ok{os.Exit(1)}`,
    rustStub: `pub fn solve(a: &str, b: &str) -> bool { let _=(a,b); false }\n`,
    rustPublicBody: `fn main(){ let cases=[("equal",crucible::solve("secret","secret")),("diff",!crucible::solve("secret","secreX")),("len",!crucible::solve("ab","abc")),("empty",crucible::solve("","")),]; print_results(&cases,false); }`,
    rustHiddenBody: `fn main(){ let xs="x".repeat(1000); let cases=[("prefix",!crucible::solve("aaaa","aaab")),("long",crucible::solve(&xs,&xs))]; print_results(&cases,true); }`,
    javaStub: `public class Solution {\n  public static boolean solve(String a, String b){ return false; }\n}\n`,
    javaPublic: `public class RunPublic {
  public static void main(String[] a){
    boolean b1=Solution.solve("secret","secret"),b2=!Solution.solve("secret","secreX"),b3=!Solution.solve("ab","abc"),b4=Solution.solve("","");
    System.out.println("{\\"results\\":[{\\"name\\":\\"equal\\",\\"pass\\":"+b1+"},{\\"name\\":\\"diff\\",\\"pass\\":"+b2+"},{\\"name\\":\\"len\\",\\"pass\\":"+b3+"},{\\"name\\":\\"empty\\",\\"pass\\":"+b4+"}]}");
    if(!(b1&&b2&&b3&&b4)) System.exit(1);
  }
}
`,
    javaHidden: `public class HiddenRun {
  public static void main(String[] a){
    String xs="x".repeat(1000);
    boolean b1=!Solution.solve("aaaa","aaab"), b2=Solution.solve(xs,xs);
    System.out.println("{\\"results\\":[{\\"name\\":\\"prefix\\",\\"pass\\":"+b1+",\\"hidden\\":true},{\\"name\\":\\"long\\",\\"pass\\":"+b2+",\\"hidden\\":true}]}");
    if(!(b1&&b2)) System.exit(1);
  }
}
`,
    jsStub: `export function solve(a, b) { return false; }\n`,
    jsPublic: `import { solve } from "../src/solution.js";
export async function runPublicTests() {
  return [
    { name: "equal", pass: solve("secret", "secret") === true },
    { name: "diff", pass: solve("secret", "secreX") === false },
    { name: "len", pass: solve("ab", "abc") === false },
    { name: "empty", pass: solve("", "") === true },
  ];
}
`,
    jsHidden: `import { solve } from "../src/solution.js";
const results = [
  { name: "prefix", pass: solve("aaaa", "aaab") === false, hidden: true },
  { name: "long", pass: solve("x".repeat(1000), "x".repeat(1000)) === true, hidden: true },
];
console.log(JSON.stringify({ results }));
process.exit(results.every((r) => r.pass) ? 0 : 1);
`,
  });
}

function sqlLogic(lang: CodingLanguage): MultilangPack {
  // Represent postings as parallel arrays for non-TS langs: ids unused, deltas matter
  return simpleFamily(lang, [
    { id: "large", description: "Many postings" },
    { id: "mixed", description: "Mixed signs" },
  ], {
    pyStub: `from typing import List, Dict\ndef solve(postings: List[Dict]) -> int:\n    return 0\n`,
    pyPublic: `from solution import solve
results=[
 {"name":"example_1","pass": solve([{"id":"a","delta":10},{"id":"b","delta":-3}])==7},
 {"name":"empty","pass": solve([])==0},
 {"name":"neg","pass": solve([{"id":"x","delta":-5}])==-5},
]
`,
    pyHidden: `from solution import solve
many=[{"id":str(i),"delta":1} for i in range(5000)]
results=[
 {"name":"large","pass": solve(many)==5000,"hidden":True},
 {"name":"mixed","pass": solve([{"id":"1","delta":100},{"id":"2","delta":-40},{"id":"3","delta":-10}])==50,"hidden":True},
]
`,
    goStub: `package solution\ntype Posting struct{ Id string; Delta int }\nfunc Solve(postings []Posting) int { return 0 }\n`,
    goPublicBody: `type R struct{Name string \`json:"name"\`; Pass bool \`json:"pass"\`}
results:=[]R{{"example_1",solution.Solve([]solution.Posting{{"a",10},{"b",-3}})==7},{"empty",solution.Solve(nil)==0},{"neg",solution.Solve([]solution.Posting{{"x",-5}})==-5}}
ok:=true; for _,r:=range results{if !r.Pass{ok=false}}; b,_:=json.Marshal(map[string]any{"results":results}); fmt.Println(string(b)); if !ok{os.Exit(1)}`,
    goHiddenBody: `many:=make([]solution.Posting,5000); for i:=range many{many[i]=solution.Posting{fmt.Sprint(i),1}}
type R struct{Name string \`json:"name"\`; Pass bool \`json:"pass"\`; Hidden bool \`json:"hidden"\`}
results:=[]R{{"large",solution.Solve(many)==5000,true},{"mixed",solution.Solve([]solution.Posting{{"1",100},{"2",-40},{"3",-10}})==50,true}}
ok:=true; for _,r:=range results{if !r.Pass{ok=false}}; b,_:=json.Marshal(map[string]any{"results":results}); fmt.Println(string(b)); if !ok{os.Exit(1)}`,
    rustStub: `pub struct Posting { pub id: String, pub delta: i32 }\npub fn solve(postings: &[Posting]) -> i32 { let _=postings; 0 }\n`,
    rustPublicBody: `fn main(){
  use crucible::Posting;
  let cases=[
    ("example_1", crucible::solve(&[Posting{id:"a".into(),delta:10},Posting{id:"b".into(),delta:-3}])==7),
    ("empty", crucible::solve(&[])==0),
    ("neg", crucible::solve(&[Posting{id:"x".into(),delta:-5}])==-5),
  ];
  print_results(&cases,false);
}
`,
    rustHiddenBody: `fn main(){
  use crucible::Posting;
  let many:Vec<_>=(0..5000).map(|i| Posting{id:i.to_string(),delta:1}).collect();
  let cases=[
    ("large", crucible::solve(&many)==5000),
    ("mixed", crucible::solve(&[Posting{id:"1".into(),delta:100},Posting{id:"2".into(),delta:-40},Posting{id:"3".into(),delta:-10}])==50),
  ];
  print_results(&cases,true);
}
`,
    javaStub: `public class Solution {\n  public static class Posting { public String id; public int delta; public Posting(String id,int delta){this.id=id;this.delta=delta;} }\n  public static int solve(Posting[] postings){ return 0; }\n}\n`,
    javaPublic: `public class RunPublic {
  public static void main(String[] a){
    boolean b1=Solution.solve(new Solution.Posting[]{new Solution.Posting("a",10),new Solution.Posting("b",-3)})==7;
    boolean b2=Solution.solve(new Solution.Posting[]{})==0;
    boolean b3=Solution.solve(new Solution.Posting[]{new Solution.Posting("x",-5)})==-5;
    System.out.println("{\\"results\\":[{\\"name\\":\\"example_1\\",\\"pass\\":"+b1+"},{\\"name\\":\\"empty\\",\\"pass\\":"+b2+"},{\\"name\\":\\"neg\\",\\"pass\\":"+b3+"}]}");
    if(!(b1&&b2&&b3)) System.exit(1);
  }
}
`,
    javaHidden: `public class HiddenRun {
  public static void main(String[] a){
    Solution.Posting[] many=new Solution.Posting[5000]; for(int i=0;i<5000;i++) many[i]=new Solution.Posting(""+i,1);
    boolean b1=Solution.solve(many)==5000;
    boolean b2=Solution.solve(new Solution.Posting[]{new Solution.Posting("1",100),new Solution.Posting("2",-40),new Solution.Posting("3",-10)})==50;
    System.out.println("{\\"results\\":[{\\"name\\":\\"large\\",\\"pass\\":"+b1+",\\"hidden\\":true},{\\"name\\":\\"mixed\\",\\"pass\\":"+b2+",\\"hidden\\":true}]}");
    if(!(b1&&b2)) System.exit(1);
  }
}
`,
    jsStub: `export function solve(postings) { return 0; }\n`,
    jsPublic: `import { solve } from "../src/solution.js";
export async function runPublicTests() {
  return [
    { name: "example_1", pass: solve([{ id: "a", delta: 10 }, { id: "b", delta: -3 }]) === 7 },
    { name: "empty", pass: solve([]) === 0 },
    { name: "neg", pass: solve([{ id: "x", delta: -5 }]) === -5 },
  ];
}
`,
    jsHidden: `import { solve } from "../src/solution.js";
const many = Array.from({ length: 5000 }, (_, i) => ({ id: String(i), delta: 1 }));
const results = [
  { name: "large", pass: solve(many) === 5000, hidden: true },
  { name: "mixed", pass: solve([{ id: "1", delta: 100 }, { id: "2", delta: -40 }, { id: "3", delta: -10 }]) === 50, hidden: true },
];
console.log(JSON.stringify({ results }));
process.exit(results.every((r) => r.pass) ? 0 : 1);
`,
  });
}

function privacy(lang: CodingLanguage): MultilangPack {
  return simpleFamily(lang, [
    { id: "plus", description: "Plus-addressing emails" },
    { id: "keep", description: "Non-email text preserved" },
  ], {
    pyStub: `def solve(text: str) -> str:\n    return text\n`,
    pyPublic: `from solution import solve
results=[
 {"name":"simple","pass": solve("hi a@b.co")=="hi [EMAIL]"},
 {"name":"none","pass": solve("no secrets")=="no secrets"},
 {"name":"multi","pass": solve("x@y.z and q@w.e")=="[EMAIL] and [EMAIL]"},
]
`,
    pyHidden: `from solution import solve
results=[
 {"name":"plus","pass": solve("a+b@c.d")=="[EMAIL]","hidden":True},
 {"name":"keep","pass": "contact" in solve("contact us"),"hidden":True},
]
`,
    goStub: `package solution\nfunc Solve(text string) string { return text }\n`,
    goPublicBody: `type R struct{Name string \`json:"name"\`; Pass bool \`json:"pass"\`}
results:=[]R{{"simple",solution.Solve("hi a@b.co")=="hi [EMAIL]"},{"none",solution.Solve("no secrets")=="no secrets"},{"multi",solution.Solve("x@y.z and q@w.e")=="[EMAIL] and [EMAIL]"}}
ok:=true; for _,r:=range results{if !r.Pass{ok=false}}; b,_:=json.Marshal(map[string]any{"results":results}); fmt.Println(string(b)); if !ok{os.Exit(1)}`,
    goHiddenBody: `type R struct{Name string \`json:"name"\`; Pass bool \`json:"pass"\`; Hidden bool \`json:"hidden"\`}
results:=[]R{{"plus",solution.Solve("a+b@c.d")=="[EMAIL]",true},{"keep",len(solution.Solve("contact us"))>=7,true}}
ok:=true; for _,r:=range results{if !r.Pass{ok=false}}; b,_:=json.Marshal(map[string]any{"results":results}); fmt.Println(string(b)); if !ok{os.Exit(1)}`,
    rustStub: `pub fn solve(text: &str) -> String { text.to_string() }\n`,
    rustPublicBody: `fn main(){
  let cases=[
    ("simple", crucible::solve("hi a@b.co")=="hi [EMAIL]"),
    ("none", crucible::solve("no secrets")=="no secrets"),
    ("multi", crucible::solve("x@y.z and q@w.e")=="[EMAIL] and [EMAIL]"),
  ];
  print_results(&cases,false);
}
`,
    rustHiddenBody: `fn main(){
  let cases=[
    ("plus", crucible::solve("a+b@c.d")=="[EMAIL]"),
    ("keep", crucible::solve("contact us").contains("contact")),
  ];
  print_results(&cases,true);
}
`,
    javaStub: `public class Solution {\n  public static String solve(String text){ return text; }\n}\n`,
    javaPublic: `public class RunPublic {
  public static void main(String[] a){
    boolean b1=Solution.solve("hi a@b.co").equals("hi [EMAIL]");
    boolean b2=Solution.solve("no secrets").equals("no secrets");
    boolean b3=Solution.solve("x@y.z and q@w.e").equals("[EMAIL] and [EMAIL]");
    System.out.println("{\\"results\\":[{\\"name\\":\\"simple\\",\\"pass\\":"+b1+"},{\\"name\\":\\"none\\",\\"pass\\":"+b2+"},{\\"name\\":\\"multi\\",\\"pass\\":"+b3+"}]}");
    if(!(b1&&b2&&b3)) System.exit(1);
  }
}
`,
    javaHidden: `public class HiddenRun {
  public static void main(String[] a){
    boolean b1=Solution.solve("a+b@c.d").equals("[EMAIL]");
    boolean b2=Solution.solve("contact us").contains("contact");
    System.out.println("{\\"results\\":[{\\"name\\":\\"plus\\",\\"pass\\":"+b1+",\\"hidden\\":true},{\\"name\\":\\"keep\\",\\"pass\\":"+b2+",\\"hidden\\":true}]}");
    if(!(b1&&b2)) System.exit(1);
  }
}
`,
    jsStub: `export function solve(text) { return text; }\n`,
    jsPublic: `import { solve } from "../src/solution.js";
export async function runPublicTests() {
  return [
    { name: "simple", pass: solve("hi a@b.co") === "hi [EMAIL]" },
    { name: "none", pass: solve("no secrets") === "no secrets" },
    { name: "multi", pass: solve("x@y.z and q@w.e") === "[EMAIL] and [EMAIL]" },
  ];
}
`,
    jsHidden: `import { solve } from "../src/solution.js";
const results = [
  { name: "plus", pass: solve("a+b@c.d") === "[EMAIL]", hidden: true },
  { name: "keep", pass: solve("contact us").includes("contact") === true, hidden: true },
];
console.log(JSON.stringify({ results }));
process.exit(results.every((r) => r.pass) ? 0 : 1);
`,
  });
}

function sre(lang: CodingLanguage): MultilangPack {
  return simpleFamily(lang, [{ id: "tiny", description: "Small error rates" }], {
    pyStub: `def solve(errors: int, total: int) -> float:\n    return 0.0\n`,
    pyPublic: `from solution import solve
results=[
 {"name":"basic","pass": abs(solve(1,100)-0.01)<1e-9},
 {"name":"zero","pass": solve(0,0)==0},
 {"name":"all","pass": solve(5,5)==1},
]
`,
    pyHidden: `from solution import solve
results=[{"name":"tiny","pass": abs(solve(1,10**6)-1e-6)<1e-12,"hidden":True}]
`,
    goStub: `package solution\nfunc Solve(errors, total int) float64 { return 0 }\n`,
    goPublicBody: `type R struct{Name string \`json:"name"\`; Pass bool \`json:"pass"\`}
abs:=func(x float64) float64 { if x<0{return -x}; return x }
results:=[]R{{"basic",abs(solution.Solve(1,100)-0.01)<1e-9},{"zero",solution.Solve(0,0)==0},{"all",solution.Solve(5,5)==1}}
ok:=true; for _,r:=range results{if !r.Pass{ok=false}}; b,_:=json.Marshal(map[string]any{"results":results}); fmt.Println(string(b)); if !ok{os.Exit(1)}`,
    goHiddenBody: `abs:=func(x float64) float64 { if x<0{return -x}; return x }
type R struct{Name string \`json:"name"\`; Pass bool \`json:"pass"\`; Hidden bool \`json:"hidden"\`}
results:=[]R{{"tiny",abs(solution.Solve(1,1_000_000)-1e-6)<1e-12,true}}
ok:=true; for _,r:=range results{if !r.Pass{ok=false}}; b,_:=json.Marshal(map[string]any{"results":results}); fmt.Println(string(b)); if !ok{os.Exit(1)}`,
    rustStub: `pub fn solve(errors: i64, total: i64) -> f64 { let _=(errors,total); 0.0 }\n`,
    rustPublicBody: `fn main(){
  let cases=[
    ("basic", (crucible::solve(1,100)-0.01).abs()<1e-9),
    ("zero", crucible::solve(0,0)==0.0),
    ("all", crucible::solve(5,5)==1.0),
  ];
  print_results(&cases,false);
}
`,
    rustHiddenBody: `fn main(){
  let cases=[("tiny", (crucible::solve(1,1_000_000)-1e-6).abs()<1e-12)];
  print_results(&cases,true);
}
`,
    javaStub: `public class Solution {\n  public static double solve(long errors, long total){ return 0; }\n}\n`,
    javaPublic: `public class RunPublic {
  public static void main(String[] a){
    boolean b1=Math.abs(Solution.solve(1,100)-0.01)<1e-9, b2=Solution.solve(0,0)==0, b3=Solution.solve(5,5)==1;
    System.out.println("{\\"results\\":[{\\"name\\":\\"basic\\",\\"pass\\":"+b1+"},{\\"name\\":\\"zero\\",\\"pass\\":"+b2+"},{\\"name\\":\\"all\\",\\"pass\\":"+b3+"}]}");
    if(!(b1&&b2&&b3)) System.exit(1);
  }
}
`,
    javaHidden: `public class HiddenRun {
  public static void main(String[] a){
    boolean b1=Math.abs(Solution.solve(1,1_000_000)-1e-6)<1e-12;
    System.out.println("{\\"results\\":[{\\"name\\":\\"tiny\\",\\"pass\\":"+b1+",\\"hidden\\":true}]}");
    if(!b1) System.exit(1);
  }
}
`,
    jsStub: `export function solve(errors, total) { return 0; }\n`,
    jsPublic: `import { solve } from "../src/solution.js";
export async function runPublicTests() {
  return [
    { name: "basic", pass: Math.abs(solve(1, 100) - 0.01) < 1e-9 },
    { name: "zero", pass: solve(0, 0) === 0 },
    { name: "all", pass: solve(5, 5) === 1 },
  ];
}
`,
    jsHidden: `import { solve } from "../src/solution.js";
const results = [{ name: "tiny", pass: Math.abs(solve(1, 1e6) - 1e-6) < 1e-12, hidden: true }];
console.log(JSON.stringify({ results }));
process.exit(results.every((r) => r.pass) ? 0 : 1);
`,
  });
}

function bit(lang: CodingLanguage): MultilangPack {
  return simpleFamily(lang, [
    { id: "max", description: "All 32 bits set" },
    { id: "alt", description: "Alternating bits" },
  ], {
    pyStub: `def solve(n: int) -> int:\n    return 0\n`,
    pyPublic: `from solution import solve
results=[
 {"name":"example_1","pass": solve(11)==3},
 {"name":"zero","pass": solve(0)==0},
 {"name":"power","pass": solve(16)==1},
]
`,
    pyHidden: `from solution import solve
results=[
 {"name":"max","pass": solve(0xffffffff)==32,"hidden":True},
 {"name":"alt","pass": solve(0b10101010)==4,"hidden":True},
]
`,
    goStub: `package solution\nfunc Solve(n uint32) int { return 0 }\n`,
    goPublicBody: `type R struct{Name string \`json:"name"\`; Pass bool \`json:"pass"\`}
results:=[]R{{"example_1",solution.Solve(11)==3},{"zero",solution.Solve(0)==0},{"power",solution.Solve(16)==1}}
ok:=true; for _,r:=range results{if !r.Pass{ok=false}}; b,_:=json.Marshal(map[string]any{"results":results}); fmt.Println(string(b)); if !ok{os.Exit(1)}`,
    goHiddenBody: `type R struct{Name string \`json:"name"\`; Pass bool \`json:"pass"\`; Hidden bool \`json:"hidden"\`}
results:=[]R{{"max",solution.Solve(0xffffffff)==32,true},{"alt",solution.Solve(0b10101010)==4,true}}
ok:=true; for _,r:=range results{if !r.Pass{ok=false}}; b,_:=json.Marshal(map[string]any{"results":results}); fmt.Println(string(b)); if !ok{os.Exit(1)}`,
    rustStub: `pub fn solve(n: u32) -> i32 { let _=n; 0 }\n`,
    rustPublicBody: `fn main(){ let cases=[("example_1",crucible::solve(11)==3),("zero",crucible::solve(0)==0),("power",crucible::solve(16)==1)]; print_results(&cases,false); }`,
    rustHiddenBody: `fn main(){ let cases=[("max",crucible::solve(0xffffffff)==32),("alt",crucible::solve(0b10101010)==4)]; print_results(&cases,true); }`,
    javaStub: `public class Solution {\n  public static int solve(long n){ return 0; }\n}\n`,
    javaPublic: `public class RunPublic {
  public static void main(String[] a){
    boolean b1=Solution.solve(11)==3,b2=Solution.solve(0)==0,b3=Solution.solve(16)==1;
    System.out.println("{\\"results\\":[{\\"name\\":\\"example_1\\",\\"pass\\":"+b1+"},{\\"name\\":\\"zero\\",\\"pass\\":"+b2+"},{\\"name\\":\\"power\\",\\"pass\\":"+b3+"}]}");
    if(!(b1&&b2&&b3)) System.exit(1);
  }
}
`,
    javaHidden: `public class HiddenRun {
  public static void main(String[] a){
    boolean b1=Solution.solve(0xffffffffL)==32, b2=Solution.solve(0b10101010)==4;
    System.out.println("{\\"results\\":[{\\"name\\":\\"max\\",\\"pass\\":"+b1+",\\"hidden\\":true},{\\"name\\":\\"alt\\",\\"pass\\":"+b2+",\\"hidden\\":true}]}");
    if(!(b1&&b2)) System.exit(1);
  }
}
`,
    jsStub: `export function solve(n) { return 0; }\n`,
    jsPublic: `import { solve } from "../src/solution.js";
export async function runPublicTests() {
  return [
    { name: "example_1", pass: solve(11) === 3 },
    { name: "zero", pass: solve(0) === 0 },
    { name: "power", pass: solve(16) === 1 },
  ];
}
`,
    jsHidden: `import { solve } from "../src/solution.js";
const results = [
  { name: "max", pass: solve(0xffffffff >>> 0) === 32, hidden: true },
  { name: "alt", pass: solve(0b10101010) === 4, hidden: true },
];
console.log(JSON.stringify({ results }));
process.exit(results.every((r) => r.pass) ? 0 : 1);
`,
  });
}

function tree(lang: CodingLanguage): MultilangPack {
  // Tree as nested arrays / nullable nodes — simplify: max depth of binary tree encoded as nested lists [val,left,right]
  return simpleFamily(lang, [
    { id: "skewed", description: "Deep skewed tree" },
    { id: "neg", description: "Negative values" },
  ], {
    pyStub: `from typing import Optional, Any\ndef solve(root: Optional[Any]) -> int:\n    return 0\n`,
    pyPublic: `from solution import solve
def n(v,l=None,r=None): return {"val":v,"left":l,"right":r}
results=[
 {"name":"example_1","pass": solve(n(3,n(9),n(20,n(15),n(7))))==3},
 {"name":"empty","pass": solve(None)==0},
 {"name":"single","pass": solve(n(1))==1},
]
`,
    pyHidden: `from solution import solve
def skew(d):
  root=None
  for i in range(d,0,-1): root={"val":i,"left":root,"right":None}
  return root
results=[
 {"name":"skewed","pass": solve(skew(200))==200,"hidden":True},
 {"name":"neg","pass": solve({"val":-1,"left":{"val":-2,"left":None,"right":None},"right":None})==2,"hidden":True},
]
`,
    goStub: `package solution
type TreeNode struct{ Val int; Left, Right *TreeNode }
func Solve(root *TreeNode) int { return 0 }
`,
    goPublicBody: `n:=func(v int, l,r *solution.TreeNode)*solution.TreeNode{return &solution.TreeNode{v,l,r}}
type R struct{Name string \`json:"name"\`; Pass bool \`json:"pass"\`}
results:=[]R{{"example_1",solution.Solve(n(3,n(9,nil,nil),n(20,n(15,nil,nil),n(7,nil,nil))))==3},{"empty",solution.Solve(nil)==0},{"single",solution.Solve(n(1,nil,nil))==1}}
ok:=true; for _,r:=range results{if !r.Pass{ok=false}}; b,_:=json.Marshal(map[string]any{"results":results}); fmt.Println(string(b)); if !ok{os.Exit(1)}`,
    goHiddenBody: `var root *solution.TreeNode; for i:=200;i>=1;i--{root=&solution.TreeNode{i,root,nil}}
neg:=&solution.TreeNode{-1,&solution.TreeNode{-2,nil,nil},nil}
type R struct{Name string \`json:"name"\`; Pass bool \`json:"pass"\`; Hidden bool \`json:"hidden"\`}
results:=[]R{{"skewed",solution.Solve(root)==200,true},{"neg",solution.Solve(neg)==2,true}}
ok:=true; for _,r:=range results{if !r.Pass{ok=false}}; b,_:=json.Marshal(map[string]any{"results":results}); fmt.Println(string(b)); if !ok{os.Exit(1)}`,
    rustStub: `pub struct TreeNode { pub val: i32, pub left: Option<Box<TreeNode>>, pub right: Option<Box<TreeNode>> }\npub fn solve(root: Option<&TreeNode>) -> i32 { let _=root; 0 }\n`,
    rustPublicBody: `fn n(v:i32,l:Option<Box<crucible::TreeNode>>,r:Option<Box<crucible::TreeNode>>)->Box<crucible::TreeNode>{ Box::new(crucible::TreeNode{val:v,left:l,right:r}) }
fn main(){
  let t=n(3,Some(n(9,None,None)),Some(n(20,Some(n(15,None,None)),Some(n(7,None,None)))));
  let cases=[
    ("example_1", crucible::solve(Some(&t))==3),
    ("empty", crucible::solve(None)==0),
    ("single", crucible::solve(Some(&n(1,None,None)))==1),
  ];
  print_results(&cases,false);
}
`,
    rustHiddenBody: `fn main(){
  let mut root: Option<Box<crucible::TreeNode>>=None;
  for i in (1..=200).rev(){ root=Some(Box::new(crucible::TreeNode{val:i,left:root,right:None})); }
  let neg=crucible::TreeNode{val:-1,left:Some(Box::new(crucible::TreeNode{val:-2,left:None,right:None})),right:None};
  let cases=[
    ("skewed", crucible::solve(root.as_deref())==200),
    ("neg", crucible::solve(Some(&neg))==2),
  ];
  print_results(&cases,true);
}
`,
    javaStub: `public class Solution {\n  public static class TreeNode { public int val; public TreeNode left,right; public TreeNode(int v){val=v;} public TreeNode(int v,TreeNode l,TreeNode r){val=v;left=l;right=r;} }\n  public static int solve(TreeNode root){ return 0; }\n}\n`,
    javaPublic: `public class RunPublic {
  public static void main(String[] a){
    Solution.TreeNode t=new Solution.TreeNode(3,new Solution.TreeNode(9),new Solution.TreeNode(20,new Solution.TreeNode(15),new Solution.TreeNode(7)));
    boolean b1=Solution.solve(t)==3,b2=Solution.solve(null)==0,b3=Solution.solve(new Solution.TreeNode(1))==1;
    System.out.println("{\\"results\\":[{\\"name\\":\\"example_1\\",\\"pass\\":"+b1+"},{\\"name\\":\\"empty\\",\\"pass\\":"+b2+"},{\\"name\\":\\"single\\",\\"pass\\":"+b3+"}]}");
    if(!(b1&&b2&&b3)) System.exit(1);
  }
}
`,
    javaHidden: `public class HiddenRun {
  public static void main(String[] a){
    Solution.TreeNode root=null; for(int i=200;i>=1;i--) root=new Solution.TreeNode(i,root,null);
    Solution.TreeNode neg=new Solution.TreeNode(-1,new Solution.TreeNode(-2),null);
    boolean b1=Solution.solve(root)==200, b2=Solution.solve(neg)==2;
    System.out.println("{\\"results\\":[{\\"name\\":\\"skewed\\",\\"pass\\":"+b1+",\\"hidden\\":true},{\\"name\\":\\"neg\\",\\"pass\\":"+b2+",\\"hidden\\":true}]}");
    if(!(b1&&b2)) System.exit(1);
  }
}
`,
    jsStub: `export function solve(root) { return 0; }\n`,
    jsPublic: `import { solve } from "../src/solution.js";
const n=(val,left=null,right=null)=>({val,left,right});
export async function runPublicTests() {
  return [
    { name: "example_1", pass: solve(n(3, n(9), n(20, n(15), n(7)))) === 3 },
    { name: "empty", pass: solve(null) === 0 },
    { name: "single", pass: solve(n(1)) === 1 },
  ];
}
`,
    jsHidden: `import { solve } from "../src/solution.js";
function skew(depth){ let root=null; for(let i=depth;i>=1;i--) root={val:i,left:root,right:null}; return root; }
const results = [
  { name: "skewed", pass: solve(skew(200)) === 200, hidden: true },
  { name: "neg", pass: solve({ val: -1, left: { val: -2, left: null, right: null }, right: null }) === 2, hidden: true },
];
console.log(JSON.stringify({ results }));
process.exit(results.every((r) => r.pass) ? 0 : 1);
`,
  });
}

function concurrency(lang: CodingLanguage): MultilangPack {
  // Keep python/js rich; go/rust/java use module-level map in same file as tests calling Solve + Reset
  return simpleFamily(lang, [
    { id: "retry_storm", description: "Retry storm same intent" },
    { id: "interleave", description: "Interleaved intents" },
  ], {
    pyStub: `_ledger = {}\n\ndef solve(intent_id: str, amount: int):\n    return {"status": "ok", "total": 0}\n\ndef reset():\n    _ledger.clear()\n`,
    pyPublic: `from solution import solve, reset
reset()
a=solve("i1",10); b=solve("i1",10); c=solve("i2",5)
results=[
 {"name":"first_ok","pass": a.get("status")=="ok" and a.get("total")==10},
 {"name":"duplicate","pass": b.get("status")=="duplicate" and b.get("total")==10},
 {"name":"other","pass": c.get("status")=="ok" and c.get("total")==5},
]
`,
    pyHidden: `from solution import solve, reset
reset()
for _ in range(100): solve("storm",1)
last=solve("storm",1)
reset(); solve("a",2); solve("b",3); dup=solve("a",9)
results=[
 {"name":"retry_storm","pass": last.get("status")=="duplicate" and last.get("total")==1,"hidden":True},
 {"name":"interleave","pass": dup.get("status")=="duplicate","hidden":True},
]
`,
    goStub: `package solution
var ledger = map[string]int{}
func Reset() { ledger = map[string]int{} }
type Charge struct{ Status string; Total int }
func Solve(intentId string, amount int) Charge { return Charge{"ok", 0} }
`,
    goPublicBody: `solution.Reset(); a:=solution.Solve("i1",10); b:=solution.Solve("i1",10); c:=solution.Solve("i2",5)
type R struct{Name string \`json:"name"\`; Pass bool \`json:"pass"\`}
results:=[]R{{"first_ok",a.Status=="ok"&&a.Total==10},{"duplicate",b.Status=="duplicate"&&b.Total==10},{"other",c.Status=="ok"&&c.Total==5}}
ok:=true; for _,r:=range results{if !r.Pass{ok=false}}; bts,_:=json.Marshal(map[string]any{"results":results}); fmt.Println(string(bts)); if !ok{os.Exit(1)}`,
    goHiddenBody: `solution.Reset(); for i:=0;i<100;i++{solution.Solve("storm",1)}; last:=solution.Solve("storm",1)
solution.Reset(); solution.Solve("a",2); solution.Solve("b",3); dup:=solution.Solve("a",9)
type R struct{Name string \`json:"name"\`; Pass bool \`json:"pass"\`; Hidden bool \`json:"hidden"\`}
results:=[]R{{"retry_storm",last.Status=="duplicate"&&last.Total==1,true},{"interleave",dup.Status=="duplicate",true}}
ok:=true; for _,r:=range results{if !r.Pass{ok=false}}; b,_:=json.Marshal(map[string]any{"results":results}); fmt.Println(string(b)); if !ok{os.Exit(1)}`,
    rustStub: `use std::collections::HashMap; use std::sync::Mutex;\nstatic LEDGER: Mutex<Option<HashMap<String,i32>>>=Mutex::new(None);\npub fn reset(){ *LEDGER.lock().unwrap()=Some(HashMap::new()); }\npub struct Charge { pub status: &'static str, pub total: i32 }\npub fn solve(_intent_id: &str, _amount: i32) -> Charge { Charge{status:"ok", total:0} }\n`,
    rustPublicBody: `fn main(){
  crucible::reset();
  let a=crucible::solve("i1",10); let b=crucible::solve("i1",10); let c=crucible::solve("i2",5);
  let cases=[
    ("first_ok", a.status=="ok" && a.total==10),
    ("duplicate", b.status=="duplicate" && b.total==10),
    ("other", c.status=="ok" && c.total==5),
  ];
  print_results(&cases,false);
}
`,
    rustHiddenBody: `fn main(){
  crucible::reset(); for _ in 0..100 { crucible::solve("storm",1); } let last=crucible::solve("storm",1);
  crucible::reset(); crucible::solve("a",2); crucible::solve("b",3); let dup=crucible::solve("a",9);
  let cases=[
    ("retry_storm", last.status=="duplicate" && last.total==1),
    ("interleave", dup.status=="duplicate"),
  ];
  print_results(&cases,true);
}
`,
    javaStub: `import java.util.*;\npublic class Solution {\n  static Map<String,Integer> ledger=new HashMap<>();\n  public static void reset(){ ledger.clear(); }\n  public static class Charge { public String status; public int total; public Charge(String s,int t){status=s;total=t;} }\n  public static Charge solve(String intentId, int amount){ return new Charge("ok",0); }\n}\n`,
    javaPublic: `public class RunPublic {
  public static void main(String[] a){
    Solution.reset();
    Solution.Charge x=Solution.solve("i1",10), y=Solution.solve("i1",10), z=Solution.solve("i2",5);
    boolean b1="ok".equals(x.status)&&x.total==10, b2="duplicate".equals(y.status)&&y.total==10, b3="ok".equals(z.status)&&z.total==5;
    System.out.println("{\\"results\\":[{\\"name\\":\\"first_ok\\",\\"pass\\":"+b1+"},{\\"name\\":\\"duplicate\\",\\"pass\\":"+b2+"},{\\"name\\":\\"other\\",\\"pass\\":"+b3+"}]}");
    if(!(b1&&b2&&b3)) System.exit(1);
  }
}
`,
    javaHidden: `public class HiddenRun {
  public static void main(String[] a){
    Solution.reset(); for(int i=0;i<100;i++) Solution.solve("storm",1); Solution.Charge last=Solution.solve("storm",1);
    Solution.reset(); Solution.solve("a",2); Solution.solve("b",3); Solution.Charge dup=Solution.solve("a",9);
    boolean b1="duplicate".equals(last.status)&&last.total==1, b2="duplicate".equals(dup.status);
    System.out.println("{\\"results\\":[{\\"name\\":\\"retry_storm\\",\\"pass\\":"+b1+",\\"hidden\\":true},{\\"name\\":\\"interleave\\",\\"pass\\":"+b2+",\\"hidden\\":true}]}");
    if(!(b1&&b2)) System.exit(1);
  }
}
`,
    jsStub: `const ledger = new Map();\nexport function solve(intentId, amount) { return { status: "ok", total: 0 }; }\nexport function __reset() { ledger.clear(); }\n`,
    jsPublic: `import { solve, __reset } from "../src/solution.js";
export async function runPublicTests() {
  __reset();
  const a = solve("i1", 10); const b = solve("i1", 10); const c = solve("i2", 5);
  return [
    { name: "first_ok", pass: a.status === "ok" && a.total === 10 },
    { name: "duplicate", pass: b.status === "duplicate" && b.total === 10 },
    { name: "other", pass: c.status === "ok" && c.total === 5 },
  ];
}
`,
    jsHidden: `import { solve, __reset } from "../src/solution.js";
__reset(); for (let i = 0; i < 100; i++) solve("storm", 1); const last = solve("storm", 1);
__reset(); solve("a", 2); solve("b", 3); const dup = solve("a", 9);
const results = [
  { name: "retry_storm", pass: last.status === "duplicate" && last.total === 1, hidden: true },
  { name: "interleave", pass: dup.status === "duplicate", hidden: true },
];
console.log(JSON.stringify({ results }));
process.exit(results.every((r) => r.pass) ? 0 : 1);
`,
  });
}

function rateLimit(lang: CodingLanguage): MultilangPack {
  return simpleFamily(lang, [
    { id: "burst", description: "Same-timestamp burst" },
    { id: "multi_key", description: "Per-key isolation" },
  ], {
    pyStub: `_hits = {}\ndef solve(key: str, now: int, limit: int) -> bool:\n    return False\ndef reset():\n    _hits.clear()\n`,
    pyPublic: `from solution import solve, reset
reset()
results=[
 {"name":"first","pass": solve("u",0,2) is True},
 {"name":"second","pass": solve("u",1,2) is True},
 {"name":"third_blocked","pass": solve("u",2,2) is False},
 {"name":"window_slide","pass": solve("u",61,2) is True},
]
`,
    pyHidden: `from solution import solve, reset
reset(); b1=solve("k",0,1) and (not solve("k",0,1))
reset(); solve("a",0,1); b2=solve("b",0,1) is True
results=[
 {"name":"burst","pass": b1,"hidden":True},
 {"name":"multi_key","pass": b2,"hidden":True},
]
`,
    goStub: `package solution
var hits = map[string][]int{}
func Reset() { hits = map[string][]int{} }
func Solve(key string, now, limit int) bool { return false }
`,
    goPublicBody: `solution.Reset()
type R struct{Name string \`json:"name"\`; Pass bool \`json:"pass"\`}
results:=[]R{{"first",solution.Solve("u",0,2)},{"second",solution.Solve("u",1,2)},{"third_blocked",!solution.Solve("u",2,2)},{"window_slide",solution.Solve("u",61,2)}}
ok:=true; for _,r:=range results{if !r.Pass{ok=false}}; b,_:=json.Marshal(map[string]any{"results":results}); fmt.Println(string(b)); if !ok{os.Exit(1)}`,
    goHiddenBody: `solution.Reset(); burst:=solution.Solve("k",0,1)&&!solution.Solve("k",0,1); solution.Reset(); solution.Solve("a",0,1); multi:=solution.Solve("b",0,1)
type R struct{Name string \`json:"name"\`; Pass bool \`json:"pass"\`; Hidden bool \`json:"hidden"\`}
results:=[]R{{"burst",burst,true},{"multi_key",multi,true}}
ok:=true; for _,r:=range results{if !r.Pass{ok=false}}; b,_:=json.Marshal(map[string]any{"results":results}); fmt.Println(string(b)); if !ok{os.Exit(1)}`,
    rustStub: `use std::collections::HashMap; use std::sync::Mutex;\nstatic HITS: Mutex<Option<HashMap<String,Vec<i64>>>>=Mutex::new(None);\npub fn reset(){ *HITS.lock().unwrap()=Some(HashMap::new()); }\npub fn solve(_key:&str,_now:i64,_limit:i32)->bool{ false }\n`,
    rustPublicBody: `fn main(){
  crucible::reset();
  let cases=[
    ("first", crucible::solve("u",0,2)),
    ("second", crucible::solve("u",1,2)),
    ("third_blocked", !crucible::solve("u",2,2)),
    ("window_slide", crucible::solve("u",61,2)),
  ];
  print_results(&cases,false);
}
`,
    rustHiddenBody: `fn main(){
  crucible::reset(); let burst=crucible::solve("k",0,1)&&!crucible::solve("k",0,1);
  crucible::reset(); crucible::solve("a",0,1); let multi=crucible::solve("b",0,1);
  let cases=[("burst",burst),("multi_key",multi)];
  print_results(&cases,true);
}
`,
    javaStub: `import java.util.*;\npublic class Solution {\n  static Map<String,List<Long>> hits=new HashMap<>();\n  public static void reset(){ hits.clear(); }\n  public static boolean solve(String key, long now, int limit){ return false; }\n}\n`,
    javaPublic: `public class RunPublic {
  public static void main(String[] a){
    Solution.reset();
    boolean b1=Solution.solve("u",0,2),b2=Solution.solve("u",1,2),b3=!Solution.solve("u",2,2),b4=Solution.solve("u",61,2);
    System.out.println("{\\"results\\":[{\\"name\\":\\"first\\",\\"pass\\":"+b1+"},{\\"name\\":\\"second\\",\\"pass\\":"+b2+"},{\\"name\\":\\"third_blocked\\",\\"pass\\":"+b3+"},{\\"name\\":\\"window_slide\\",\\"pass\\":"+b4+"}]}");
    if(!(b1&&b2&&b3&&b4)) System.exit(1);
  }
}
`,
    javaHidden: `public class HiddenRun {
  public static void main(String[] a){
    Solution.reset(); boolean burst=Solution.solve("k",0,1)&&!Solution.solve("k",0,1);
    Solution.reset(); Solution.solve("a",0,1); boolean multi=Solution.solve("b",0,1);
    System.out.println("{\\"results\\":[{\\"name\\":\\"burst\\",\\"pass\\":"+burst+",\\"hidden\\":true},{\\"name\\":\\"multi_key\\",\\"pass\\":"+multi+",\\"hidden\\":true}]}");
    if(!(burst&&multi)) System.exit(1);
  }
}
`,
    jsStub: `const hits = new Map();\nexport function solve(key, now, limit) { return false; }\nexport function __reset() { hits.clear(); }\n`,
    jsPublic: `import { solve, __reset } from "../src/solution.js";
export async function runPublicTests() {
  __reset();
  return [
    { name: "first", pass: solve("u", 0, 2) === true },
    { name: "second", pass: solve("u", 1, 2) === true },
    { name: "third_blocked", pass: solve("u", 2, 2) === false },
    { name: "window_slide", pass: solve("u", 61, 2) === true },
  ];
}
`,
    jsHidden: `import { solve, __reset } from "../src/solution.js";
__reset(); const burst = solve("k", 0, 1) && !solve("k", 0, 1);
__reset(); solve("a", 0, 1); const multi = solve("b", 0, 1) === true;
const results = [
  { name: "burst", pass: burst, hidden: true },
  { name: "multi_key", pass: multi, hidden: true },
];
console.log(JSON.stringify({ results }));
process.exit(results.every((r) => r.pass) ? 0 : 1);
`,
  });
}

function mobile(lang: CodingLanguage): MultilangPack {
  return simpleFamily(lang, [{ id: "many", description: "Large merge LWW" }], {
    pyStub: `from typing import List, Dict\ndef solve(local: List[Dict], remote: List[Dict]) -> List[Dict]:\n    return []\n`,
    pyPublic: `from solution import solve
def norm(rows): return sorted(rows, key=lambda x:x["id"])
results=[
 {"name":"merge","pass": norm(solve([{"id":"a","value":1}],[{"id":"b","value":2}]))==[{"id":"a","value":1},{"id":"b","value":2}]},
 {"name":"lww","pass": norm(solve([{"id":"a","value":1}],[{"id":"a","value":9}]))==[{"id":"a","value":9}]},
 {"name":"empty","pass": solve([],[])==[]},
]
`,
    pyHidden: `from solution import solve
local=[{"id":str(i),"value":i} for i in range(100)]
out=solve(local,[{"id":"0","value":999}])
zero=next(x for x in out if x["id"]=="0")
results=[{"name":"many","pass": zero["value"]==999,"hidden":True}]
`,
    goStub: `package solution\ntype Mut struct{ Id string; Value int }\nfunc Solve(local, remote []Mut) []Mut { return nil }\n`,
    goPublicBody: `eq:=func(a,b []solution.Mut) bool { ba,_:=json.Marshal(a); bb,_:=json.Marshal(b); return string(ba)==string(bb) }
sort:=func(a []solution.Mut) []solution.Mut { out:=append([]solution.Mut{},a...); for i:=0;i<len(out);i++{ for j:=i+1;j<len(out);j++{ if out[j].Id<out[i].Id{out[i],out[j]=out[j],out[i]} } }; return out }
type R struct{Name string \`json:"name"\`; Pass bool \`json:"pass"\`}
results:=[]R{{"merge",eq(sort(solution.Solve([]solution.Mut{{"a",1}},[]solution.Mut{{"b",2}})),[]solution.Mut{{"a",1},{"b",2}})},{"lww",eq(sort(solution.Solve([]solution.Mut{{"a",1}},[]solution.Mut{{"a",9}})),[]solution.Mut{{"a",9}})},{"empty",len(solution.Solve(nil,nil))==0}}
ok:=true; for _,r:=range results{if !r.Pass{ok=false}}; b,_:=json.Marshal(map[string]any{"results":results}); fmt.Println(string(b)); if !ok{os.Exit(1)}`,
    goHiddenBody: `local:=make([]solution.Mut,100); for i:=range local{local[i]=solution.Mut{fmt.Sprint(i),i}}
out:=solution.Solve(local,[]solution.Mut{{"0",999}}); pass:=false; for _,m:=range out{ if m.Id=="0"&&m.Value==999{pass=true} }
type R struct{Name string \`json:"name"\`; Pass bool \`json:"pass"\`; Hidden bool \`json:"hidden"\`}
results:=[]R{{"many",pass,true}}
ok:=true; for _,r:=range results{if !r.Pass{ok=false}}; b,_:=json.Marshal(map[string]any{"results":results}); fmt.Println(string(b)); if !ok{os.Exit(1)}`,
    rustStub: `#[derive(Clone,Debug,PartialEq,Eq)] pub struct Mut { pub id: String, pub value: i32 }\npub fn solve(local:&[Mut], remote:&[Mut]) -> Vec<Mut> { let _=(local,remote); vec![] }\n`,
    rustPublicBody: `fn norm(mut v:Vec<crucible::Mut>)->Vec<crucible::Mut>{ v.sort_by(|a,b| a.id.cmp(&b.id)); v }
fn main(){
  use crucible::Mut;
  let cases=[
    ("merge", norm(crucible::solve(&[Mut{id:"a".into(),value:1}],&[Mut{id:"b".into(),value:2}]))==vec![Mut{id:"a".into(),value:1},Mut{id:"b".into(),value:2}]),
    ("lww", norm(crucible::solve(&[Mut{id:"a".into(),value:1}],&[Mut{id:"a".into(),value:9}]))==vec![Mut{id:"a".into(),value:9}]),
    ("empty", crucible::solve(&[],&[]).is_empty()),
  ];
  print_results(&cases,false);
}
`,
    rustHiddenBody: `fn main(){
  use crucible::Mut;
  let local:Vec<_>=(0..100).map(|i| Mut{id:i.to_string(),value:i}).collect();
  let out=crucible::solve(&local,&[Mut{id:"0".into(),value:999}]);
  let pass=out.iter().any(|m| m.id=="0" && m.value==999);
  let cases=[("many",pass)];
  print_results(&cases,true);
}
`,
    javaStub: `import java.util.*;\npublic class Solution {\n  public static class Mut { public String id; public int value; public Mut(String id,int value){this.id=id;this.value=value;} }\n  public static List<Mut> solve(List<Mut> local, List<Mut> remote){ return new ArrayList<>(); }\n}\n`,
    javaPublic: `import java.util.*;
public class RunPublic {
  static List<Solution.Mut> norm(List<Solution.Mut> in){ List<Solution.Mut> o=new ArrayList<>(in); o.sort(Comparator.comparing(m->m.id)); return o; }
  static boolean eq(List<Solution.Mut> a, List<Solution.Mut> b){ if(a.size()!=b.size())return false; for(int i=0;i<a.size();i++) if(!a.get(i).id.equals(b.get(i).id)||a.get(i).value!=b.get(i).value) return false; return true; }
  public static void main(String[] a){
    boolean b1=eq(norm(Solution.solve(List.of(new Solution.Mut("a",1)),List.of(new Solution.Mut("b",2)))), List.of(new Solution.Mut("a",1),new Solution.Mut("b",2)));
    boolean b2=eq(norm(Solution.solve(List.of(new Solution.Mut("a",1)),List.of(new Solution.Mut("a",9)))), List.of(new Solution.Mut("a",9)));
    boolean b3=Solution.solve(List.of(),List.of()).isEmpty();
    System.out.println("{\\"results\\":[{\\"name\\":\\"merge\\",\\"pass\\":"+b1+"},{\\"name\\":\\"lww\\",\\"pass\\":"+b2+"},{\\"name\\":\\"empty\\",\\"pass\\":"+b3+"}]}");
    if(!(b1&&b2&&b3)) System.exit(1);
  }
}
`,
    javaHidden: `import java.util.*;
public class HiddenRun {
  public static void main(String[] a){
    List<Solution.Mut> local=new ArrayList<>(); for(int i=0;i<100;i++) local.add(new Solution.Mut(""+i,i));
    List<Solution.Mut> out=Solution.solve(local, List.of(new Solution.Mut("0",999)));
    boolean pass=out.stream().anyMatch(m->"0".equals(m.id)&&m.value==999);
    System.out.println("{\\"results\\":[{\\"name\\":\\"many\\",\\"pass\\":"+pass+",\\"hidden\\":true}]}");
    if(!pass) System.exit(1);
  }
}
`,
    jsStub: `export function solve(local, remote) { return []; }\n`,
    jsPublic: `import { solve } from "../src/solution.js";
function eq(a,b){ const n=x=>[...x].sort((p,q)=>p.id.localeCompare(q.id)); return JSON.stringify(n(a))===JSON.stringify(n(b)); }
export async function runPublicTests() {
  return [
    { name: "merge", pass: eq(solve([{id:"a",value:1}],[{id:"b",value:2}]), [{id:"a",value:1},{id:"b",value:2}]) },
    { name: "lww", pass: eq(solve([{id:"a",value:1}],[{id:"a",value:9}]), [{id:"a",value:9}]) },
    { name: "empty", pass: eq(solve([],[]), []) },
  ];
}
`,
    jsHidden: `import { solve } from "../src/solution.js";
const out = solve(Array.from({length:100},(_,i)=>({id:String(i),value:i})), [{id:"0",value:999}]);
const results = [{ name: "many", pass: out.find(x=>x.id==="0")?.value === 999, hidden: true }];
console.log(JSON.stringify({ results }));
process.exit(results.every((r) => r.pass) ? 0 : 1);
`,
  });
}

/** Fix Cargo package name to always be \`crucible\` so rust bins can \`use crucible::\`. */
export function rustCargoTomlFixed(): StarterFile {
  return {
    path: "Cargo.toml",
    content: `[package]
name = "crucible"
version = "0.1.0"
edition = "2021"

[[bin]]
name = "run_public"
path = "tests/run_public.rs"

[[bin]]
name = "hidden_run"
path = "tests/hidden_run.rs"
`,
    language: "toml",
  };
}
