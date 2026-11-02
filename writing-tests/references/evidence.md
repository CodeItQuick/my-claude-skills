# Evidence

Each graded claim that this skill cites, copied from the ledger where it
was researched. A grade is strong, moderate, weak, unsupported or
folklore. The boundary says where the claim stops holding.

### code_quality-23 (strong)

Full-word identifier names are comprehended faster and more accurately than single letters or abbreviations, with the gap largest on tasks requiring semantic understanding

**Boundary:** Replicated across four controlled experiments including 72 professional developers

**Sources:**

- [Shorter identifier names take longer to comprehend](https://consensus.app/papers/details/416dc7be214358509fe68b044739aa09/?utm_source=claude_desktop) (Johannes C. Hofmeister et al., 2017, 138 citations, Empirical Software Engineering, DOI: 10.1007/s10664-018-9621-x)
- [Descriptive Compound Identifier Names Improve Source Code Comprehension](https://consensus.app/papers/details/129014cd7a285020a92a9cefd846bb41/?utm_source=claude_desktop) (Andrea Schankin et al., 2018, 79 citations, ICPC 2018, DOI: 10.1145/3196321.3196332)
- [Effective identifier names for comprehension and memory](https://consensus.app/papers/details/858e3e0adeac57c2a339aeb562f5a3fe/?utm_source=claude_desktop) (Dawn J Lawrie et al., 2007, 133 citations, Innovations in Systems and Software Engineering, DOI: 10.1007/s11334-007-0031-2)
- [An eye tracking study assessing source code readability rules for program comprehension](https://consensus.app/papers/details/a873f8cd59065bbe8651b85b312f4058/?utm_source=claude_desktop) (Kang-il Park et al., 2024, 11 citations, Empirical Software Engineering, DOI: 10.1007/s10664-024-10532-x)

### code_quality-48 (moderate)

The cost of duplication is carried by inconsistent change rather than by duplication itself: inconsistent changes to clones are very frequent, and a significant number of faults trace to them

**Boundary:** One large case study over commercial and open-source systems; detector-dependent

**Sources:**

- [Do code clones matter?](https://consensus.app/papers/details/ee2445cef8d15e40b14dc23b54a17823/?utm_source=claude_desktop) (Elmar Jürgens et al., 2009, 492 citations, 2009 IEEE 31st International Conference on Software Engineering, DOI: 10.1109/icse.2009.5070547)

### code_quality-49 (moderate)

Near-miss clones, Type 2 and Type 3, are more fault-prone and more expensive to maintain than exact Type 1 clones, so clone management must prioritise them

**Boundary:** Replicated across several mining studies, all detector-dependent

**Sources:**

- [Does cloned code increase maintenance effort?](https://consensus.app/papers/details/bd077bdf81d75af79bf141c119d185a6/?utm_source=claude_desktop) (Manishankar Mondal et al., 2017, 29 citations, 2017 IEEE 11th International Workshop on Software Clones (IWSC), DOI: 10.1109/iwsc.2017.7880507)
- [On the association between code cloning and fault-proneness: An empirical investigation](https://consensus.app/papers/details/3576ee6465f457d08bad77bbfa14d259/?utm_source=claude_desktop) (Mahmoud O. Elish, 2017, 2 citations, 2017 Computing Conference, DOI: 10.1109/sai.2017.8252205)
- [Bug Replication in Code Clones: An Empirical Study](https://consensus.app/papers/details/f0ac613cffa85d17a32838318bee2c85/?utm_source=claude_desktop) (Judith F. Islam et al., 2016, 45 citations, 2016 IEEE 23rd International Conference on Software Analysis, Evolution, and Reengineering (SANER), DOI: 10.1109/saner.2016.78)
- [An empirical study of the fault-proneness of clone mutation and clone migration](https://consensus.app/papers/details/828beeccf3de5b188d55172baf477ca0/?utm_source=claude_desktop) (Shuai Xie et al., 2013, 41 citations, 2013 10th Working Conference on Mining Software Repositories (MSR), DOI: 10.1109/msr.2013.6624022)

### code_quality-52 (folklore)

Duplicated code is a bad smell and must be removed

**Boundary:** [75] tested the folk claim directly against four open-source projects and did not support it, finding the great majority of bugs unassociated with clones and no disproportionate effort to fix clone-dense bugs. [80] found cloning often used deliberately as a templating strategy whose copies evolve independently. The measured cost of duplication is real and conditional, per -48 and -49, which is a different claim from the smell

**Sources:**

- [Clones: what is that smell?](https://consensus.app/papers/details/ceece3a9c3c05438bab132cbb5cc7121/?utm_source=claude_desktop) (Foyzur Rahman et al., 2010, 203 citations, Empirical Software Engineering, DOI: 10.1007/s10664-011-9195-3)
- [An empirical study on the maintenance of source code clones](https://consensus.app/papers/details/e78b89852a305a15998bf24b6bb1254f/?utm_source=claude_desktop) (Suresh Thummalapenta et al., 2010, 218 citations, Empirical Software Engineering, DOI: 10.1007/s10664-009-9108-x)

### code_quality-92 (moderate)

Linguistic antipatterns, meaning inconsistencies between a name, its documentation and what the code actually does, significantly increase developers' measured cognitive load

**Boundary:** Functional near-infrared spectroscopy with eye tracking, mapping load to specific identifiers. Physiological measurement rather than self-report, which is what makes it stronger than the perception studies it sits beside

**Sources:**

- [The Effect of Poor Source Code Lexicon and Readability on Developers' Cognitive Load](https://consensus.app/papers/details/0f07b6100ae8572ba9b9391c7d9da56b/?utm_source=claude_desktop) (Sarah Fakhoury et al., 2018, 130 citations, 2018 IEEE/ACM 26th International Conference on Program Comprehension (ICPC), DOI: 10.1145/3196321.3196347)

### frontend-16 (moderate)

Variable re-assignment and assignment inside conditional statements carry the highest fault hazard rates among JavaScript smells, and variable re-assignment is also the most prevalent

**Boundary:** Same two studies as `-15`

**Sources:**

- [An empirical study of code smells in JavaScript projects](https://consensus.app/papers/details/cc9925adee105f39a3b5637431823ddf/?utm_source=claude_desktop) (Amir Saboury et al., 2017, IEEE SANER 2017, DOI: 10.1109/saner.2017.7884630)
- [A large-scale empirical study of code smells in JavaScript projects](https://consensus.app/papers/details/4b209234f93e5c55b886030882fcf729/?utm_source=claude_desktop) (David Johannes et al., 2019, Software Quality Journal, DOI: 10.1007/s11219-019-09442-9)

### software_testing-14 (strong)

Test flakiness is pervasive across ecosystems and is dominated by a small number of root causes — async wait and concurrency, test order dependency, and test infrastructure

**Boundary:** Open-source-dominated samples mined from issues and commits, so proportions reflect what developers recorded

**Sources:**

- [An empirical analysis of flaky tests](https://consensus.app/papers/details/2a95d4714d415879a9847a2c427a8d9a/?utm_source=claude_desktop) (Q. Luo et al., 2014, 501 citations, FSE 2014, DOI: 10.1145/2635868.2635920)
- [A Survey of Flaky Tests](https://consensus.app/papers/details/3f5d5d111ba15665b4967ca396d0febd/?utm_source=claude_desktop) (Owain Parry et al., 2022, 163 citations, ACM Trans. Softw. Eng. Methodol., DOI: 10.1145/3476105)
- [An Empirical Study of Flaky Tests in Python](https://consensus.app/papers/details/3e620a144d0051cc9d6c8a638ed0db3f/?utm_source=claude_desktop) (Martin Gruber et al., 2021, 79 citations, ICST 2021, DOI: 10.1109/icst49551.2021.00026)
- [Test Flakiness Across Programming Languages](https://consensus.app/papers/details/27e95cbeb3ec5118b63d3911e1124766/?utm_source=claude_desktop) (Keila Costa et al., 2023, 17 citations, IEEE Transactions on Software Engineering, DOI: 10.1109/tse.2022.3208864)
- [An Empirical Study of Flaky Tests in JavaScript](https://consensus.app/papers/details/8d6e6067167d50a69b000dcb1402bded/?utm_source=claude_desktop) (Negar Hashemi et al., 2022, 29 citations, ICSME 2022, DOI: 10.1109/icsme55016.2022.00011)
- [Root causing flaky tests in a large-scale industrial setting](https://consensus.app/papers/details/1b74f9b231455c80821056fca1b93dd7/?utm_source=claude_desktop) (Wing Lam et al., 2019, 149 citations, ISSTA 2019, DOI: 10.1145/3293882.3330570)
- [Test flakiness' causes, detection, impact and responses: A multivocal review](https://consensus.app/papers/details/d071c6bceade51d889479161f3031de0/?utm_source=claude_desktop) (Amjed Tahir et al., 2023, 16 citations, J. Syst. Softw., DOI: 10.1016/j.jss.2023.111837)

### software_testing-15 (strong)

The dominant causes of flakiness differ by language: order dependency dominates in Python while concurrency and async wait dominate in Java and JavaScript

**Boundary:** Language is a proxy for what is built in it — Python's order dependency travels with its test frameworks and its workloads

**Sources:**

- [An Empirical Study of Flaky Tests in Python](https://consensus.app/papers/details/3e620a144d0051cc9d6c8a638ed0db3f/?utm_source=claude_desktop) (Martin Gruber et al., 2021, 79 citations, ICST 2021, DOI: 10.1109/icst49551.2021.00026)
- [Test Flakiness Across Programming Languages](https://consensus.app/papers/details/27e95cbeb3ec5118b63d3911e1124766/?utm_source=claude_desktop) (Keila Costa et al., 2023, 17 citations, IEEE Transactions on Software Engineering, DOI: 10.1109/tse.2022.3208864)
- [An Empirical Study of Flaky Tests in JavaScript](https://consensus.app/papers/details/8d6e6067167d50a69b000dcb1402bded/?utm_source=claude_desktop) (Negar Hashemi et al., 2022, 29 citations, ICSME 2022, DOI: 10.1109/icsme55016.2022.00011)

### software_testing-16 (moderate)

Most flaky tests are flaky from the moment they are added, so running detectors on newly added and directly modified tests catches around 85% of them

**Boundary:** 55 Java projects and two detectors; the other 15% turn flaky through unrelated changes and are missed entirely

**Sources:**

- [A large-scale longitudinal study of flaky tests](https://consensus.app/papers/details/5cd5e4a501c3583a982affe1f59210e1/?utm_source=claude_desktop) (Wing Lam et al., 2020, 67 citations, Proceedings of the ACM on Programming Languages, DOI: 10.1145/3428270)

### software_testing-23 (strong)

Test smells are usually introduced when the test code is first committed and survive a long time; most removals are a by-product of other maintenance rather than deliberate refactoring

**Boundary:** Open-source maintenance histories; the 17% of deliberate removals concentrate in Exception Catch/Throw and Sleepy Test

**Sources:**

- [An empirical investigation into the nature of test smells](https://consensus.app/papers/details/85d4bdd891765aa6a8039bb862afabb5/?utm_source=claude_desktop) (Michele Tufano et al., 2016, 169 citations, ASE 2016, DOI: 10.1145/2970276.2970340)
- [The secret life of test smells - an empirical study on test smell evolution and maintenance](https://consensus.app/papers/details/8678a777a8415f6ab8b734aac2a6f2fa/?utm_source=claude_desktop) (Dong Jae Kim et al., 2021, 43 citations, Empirical Software Engineering, DOI: 10.1007/s10664-021-09969-1)

### software_testing-24 (moderate)

Most individual test smell types have only a minimal effect on post-release defects, and current smell-detection rules are widely judged too strict and poorly matched to real maintainability concerns

**Boundary:** Measured through the same detection rules whose accuracy is disputed, so a minimal effect may be a measurement artefact

**Sources:**

- [Test smells 20 years later: detectability, validity, and reliability](https://consensus.app/papers/details/d35bc8a91d2258cc99c0adae558f9e65/?utm_source=claude_desktop) (Annibale Panichella et al., 2022, 43 citations, Empirical Software Engineering, DOI: 10.1007/s10664-022-10207-5)
- [The secret life of test smells - an empirical study on test smell evolution and maintenance](https://consensus.app/papers/details/8678a777a8415f6ab8b734aac2a6f2fa/?utm_source=claude_desktop) (Dong Jae Kim et al., 2021, 43 citations, Empirical Software Engineering, DOI: 10.1007/s10664-021-09969-1)
- [Machine learning-based test smell detection](https://consensus.app/papers/details/a82e0370c2d95e96ba636b99fc3d4239/?utm_source=claude_desktop) (Valeria Pontillo et al., 2022, 30 citations, Empirical Software Engineering, DOI: 10.1007/s10664-023-10436-2)

### software_testing-33 (moderate)

Developers mock selectively and by architectural role: dependencies that make testing difficult (infrastructure, external services) are mocked, while classes encapsulating domain concepts are deliberately not

**Boundary:** Java open-source plus one industrial case, Mockito-centric; scope-derived bound, no moderator has been tested

**Sources:**

- [Mock objects for testing java systems](https://consensus.app/papers/details/9d5bd6153a6b5f23bafac4b9042f5e03/?utm_source=claude_desktop) (D. Spadini et al., 2018, 52 citations, Empirical Software Engineering, DOI: 10.1007/s10664-018-9663-0)
- [To Mock or Not to Mock? An Empirical Study on Mocking Practices](https://consensus.app/papers/details/8dc0aceea0b755c8ad560a3c7cc02cad/?utm_source=claude_desktop) (D. Spadini et al., 2017, 30 citations, MSR 2017, DOI: 10.1109/msr.2017.61)

### software_testing-34 (moderate)

Mocking increases coupling between test and production code; mocks introduced with a test persist for its whole lifetime and force test changes whenever production code changes

**Boundary:** Same Java/Mockito setting; coupling is measured by co-change, not by developer effort or defect escape

**Sources:**

- [Mock objects for testing java systems](https://consensus.app/papers/details/9d5bd6153a6b5f23bafac4b9042f5e03/?utm_source=claude_desktop) (D. Spadini et al., 2018, 52 citations, Empirical Software Engineering, DOI: 10.1007/s10664-018-9663-0)

### software_testing-36 (moderate)

Test doubles can themselves introduce test smells and outright mistakes into test code

**Boundary:** Android applications; several of the mistakes catalogued are specific to that framework's lifecycle

**Sources:**

- [Use of Test Doubles in Android Testing: An In-Depth Investigation](https://consensus.app/papers/details/fa9b3062f1ff5070a69c709d2d062390/?utm_source=claude_desktop) (M. Fazzini et al., 2022, 26 citations, ICSE 2022, DOI: 10.1145/3510003.3510175)

### software_testing-42 (moderate)

Real project test suites do not follow the proportions the test pyramid prescribes, and the practitioner literature calls for models better correlated with what industrial projects actually build

**Boundary:** Five agile projects and one Node.js benchmark; describes what suites look like, never whether the shape works

**Sources:**

- [Test automation pyramid from theory to practice](https://consensus.app/papers/details/f02b8f8b9d895110bb4a9e59f08b6d60/?utm_source=claude_desktop) (Andrei Contan et al., 2018, 21 citations, IEEE AQTR 2018, DOI: 10.1109/aqtr.2018.8402699)
- [Augmenting unit test suites from integration tests](https://consensus.app/papers/details/12b9a9b437e45f36bcd381afc2d0823c/?utm_source=claude_desktop) (Katerina Paltoglou et al., 2026, 0 citations, ArXiv, DOI: 10.48550/arxiv.2604.17508)

### software_testing-43 (unsupported)

Component and service-level tests detect business-logic defects at a substantially higher rate than end-to-end tests and surface them earlier in the pipeline

**Boundary:** —

**Sources:**


### software_testing-44 (folklore)

A suite should be mostly unit tests because that is the shape the test pyramid prescribes

**Boundary:** —

**Sources:**


### software_testing-59 (moderate)

Test smell detection is unreliable: heuristic tools misclassify over 70% of instances and machine-learned detectors do not exceed an average F-measure of 51%

**Boundary:** Four to six smell types on hand-annotated Java datasets; the tools may be accurate on smells nobody measured

**Sources:**

- [Test smells 20 years later: detectability, validity, and reliability](https://consensus.app/papers/details/d35bc8a91d2258cc99c0adae558f9e65/?utm_source=claude_desktop) (Annibale Panichella et al., 2022, 43 citations, Empirical Software Engineering, DOI: 10.1007/s10664-022-10207-5)
- [Machine learning-based test smell detection](https://consensus.app/papers/details/a82e0370c2d95e96ba636b99fc3d4239/?utm_source=claude_desktop) (Valeria Pontillo et al., 2022, 30 citations, Empirical Software Engineering, DOI: 10.1007/s10664-023-10436-2)

### software_testing-83 (strong)

Ambient state is a flakiness cause in its own right, separate from async wait and order dependency: a test that reads the system clock, a randomness API or the environment is non-deterministic by construction, and controlling those APIs detects such tests more efficiently than rerunning does

**Boundary:** Network and randomness APIs account for 13% of Python flakiness; the API-control result is a Java Standard Library technique, and generated tests skew far more to randomness than developer-written ones

**Sources:**

- [An Empirical Study of Flaky Tests in Python](https://consensus.app/papers/details/3e620a144d0051cc9d6c8a638ed0db3f/?utm_source=claude_desktop) (Martin Gruber et al., 2021, 79 citations, ICST 2021, DOI: 10.1109/icst49551.2021.00026)
- [Detecting Flaky Tests by Controlling Nondeterministic API Behavior](https://consensus.app/papers/details/9bccca2ce2255b51a975d2bb6cefc4b7/?utm_source=claude_desktop) (Hengchen Yuan et al., 2026, 0 citations, Proceedings of the ACM on Programming Languages, DOI: 10.1145/3798265)
- [Detecting flaky tests in probabilistic and machine learning applications](https://consensus.app/papers/details/eb6b3602957f567d8b224a3c08bfc053/?utm_source=claude_desktop) (Saikat Dutta et al., 2020, 81 citations, Proceedings of the 29th ACM SIGSOFT International Symposium on Software Testing and Analysis, DOI: 10.1145/3395363.3397366)
- [Do Automatic Test Generation Tools Generate Flaky Tests?](https://consensus.app/papers/details/b21e9aec1b6453e2863a8a865074ba39/?utm_source=claude_desktop) (Martin Gruber et al., 2023, 21 citations, 2024 IEEE/ACM 46th International Conference on Software Engineering (ICSE), DOI: 10.1145/3597503.3608138)

### software_testing-84 (moderate)

Among the flakiness factors practitioners name, test case size and test case simplicity are the two with a strong measured effect on the test artefacts

**Boundary:** A multiple-case study in closed-source development; 19 perceived factors were catalogued and only these two held against the artefacts

**Sources:**

- [Empirical analysis of practitioners' perceptions of test flakiness factors](https://consensus.app/papers/details/2362516b1b0055b79decb179e711c493/?utm_source=claude_desktop) (Azeem Ahmad et al., 2019, 22 citations, Software Testing, DOI: 10.1002/stvr.1791)

### software_testing-93 (moderate)

A green build is not proof the work was done: 11% of successful jobs are rerun by developers who do not trust them, and silent failures, where a job reports success having skipped part of its tasks, come from artifact operation errors, caching errors and ignored exit codes

**Boundary:** 142,387 jobs across 81 industrial projects; the silent-failure categories come from 92 public issues, so the taxonomy is documented rather than measured at scale

**Sources:**

- [On the Illusion of Success: An Empirical Study of Build Reruns and Silent Failures in Industrial CI](https://consensus.app/papers/details/45ee35e31bb95ac295aabe662f345e7a/?utm_source=claude_desktop) (Henri Aïdasso et al., 2025, 4 citations, ArXiv, DOI: 10.48550/arxiv.2509.14347)

### software_testing-97 (strong)

The number of assertions in a test suite correlates strongly with its fault-detection effectiveness, and that factor is what drives the apparent relationship between suite size and effectiveness

**Boundary:** 6,700 suites composed from 24,000 assertions across five Java projects; assertion count and suite size are correlated with each other, which the analysis separates rather than removes

**Sources:**

- [Assertions are strongly correlated with test suite effectiveness](https://consensus.app/papers/details/4c3c2418486c521c9e58ceff90fb735f/?utm_source=claude_desktop) (Yucheng Zhang et al., 2015, 118 citations, Proceedings of the 2015 10th Joint Meeting on Foundations of Software Engineering, DOI: 10.1145/2786805.2786858)

### software_testing-99 (moderate)

A more elaborate oracle is not proportionally better: checking part of the output state reveals nearly as many failures as checking all of it, and checking state less often is about as effective as checking it more often

**Boundary:** Model-based testing with ten oracle strategies against two baselines; the finding is about where extra checking stops paying, not about whether checking pays

**Sources:**

- [Test Oracle Strategies for Model-Based Testing](https://consensus.app/papers/details/63ab370b461f5dd9a99a368988d9be28/?utm_source=claude_desktop) (Nan Li et al., 2017, 75 citations, IEEE Transactions on Software Engineering, DOI: 10.1109/tse.2016.2597136)

### software_testing-100 (moderate)

Human-written assertions systematically observe less of the program state than they could, and simple changes such as checking intermediate return values or extracting state more deeply improve regression detection by about 36% on average

**Boundary:** Twelve real-world projects under an experimental framework; richer observation also costs more to write and read, which the study treats as a trade-off rather than a free gain

**Sources:**

- [Revealing Regressions: A Comparative Study of State-Capture Strategies in Validating Program Behavior](https://consensus.app/papers/details/5595215b3f495790a918b724f144c2f3/?utm_source=claude_desktop) (Hang Du et al., 2026, 0 citations, Proceedings of the ACM on Software Engineering, DOI: 10.1145/3797107)

### software_testing-101 (moderate)

An assertion that depends on a value the test does not control is brittle by construction, and both brittle assertions and inputs no assertion ever checks can be found automatically

**Boundary:** Over 4,000 real JUnit tests analysed by dynamic tainting, finding 164 brittle assertions and 1,618 tests with unused inputs

**Sources:**

- [Improving oracle quality by detecting brittle assertions and unused inputs in tests](https://consensus.app/papers/details/6dfe1a392d49507aaf06cfb9113800f3/?utm_source=claude_desktop) (Chen Huo et al., 2014, 58 citations, Proceedings of the 22nd ACM SIGSOFT International Symposium on Foundations of Software Engineering, DOI: 10.1145/2635868.2635917)

### software_testing-121 (moderate)

Identifiers made of words let developers find defects about 19% faster than single letters or abbreviations, and letters and abbreviations do not differ from each other

**Boundary:** 72 professional C# developers locating defects, within-subjects across all three naming styles; the task is defect location rather than general comprehension

**Sources:**

- [Shorter identifier names take longer to comprehend](https://consensus.app/papers/details/416dc7be214358509fe68b044739aa09/?utm_source=claude_desktop) (Johannes C. Hofmeister et al., 2017, 138 citations, Empirical Software Engineering, DOI: 10.1007/s10664-018-9621-x)

### software_testing-122 (moderate)

Longer descriptive identifier names help find semantic defects about 14% faster, the effect disappears when the defect is syntactic, and it appears for experienced developers rather than for less experienced ones

**Boundary:** 88 Java developers in a web-based study; the benefit is specific to defects that require understanding the code rather than scanning it

**Sources:**

- [Descriptive Compound Identifier Names Improve Source Code Comprehension](https://consensus.app/papers/details/129014cd7a285020a92a9cefd846bb41/?utm_source=claude_desktop) (Andrea Schankin et al., 2018, 79 citations, 2018 IEEE/ACM 26th International Conference on Program Comprehension (ICPC), DOI: 10.1145/3196321.3196332)
