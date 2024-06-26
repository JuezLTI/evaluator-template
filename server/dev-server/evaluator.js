import { loadSchemaPEARL, EvaluationReport } from "evaluation-report-juezlti"
import "babel-polyfill"

const capabilities = [{
            id: "template-evaluator",
            features: [{
                    name: "language",
                    value: "template",
                },
                {
                    name: "version",
                    value: "template 1.0",
                },
                {
                    name: "engine",
                    value: "https://template.com/",
                },
            ],
            templateFeatures: {}
        },]

async function evalProgramming(programmingExercise, evalReq) {
    return new Promise((resolve) => {
        loadSchemaPEARL().then(async () => {

            var evalRes = new EvaluationReport(),
                response = {},
                summary = {
                    "classify" : 'Accepted',
                    "feedback" : 'Well done'
                }

            evalRes.setRequest(evalReq.request)
            let program = evalReq.request.program,
                capability = getCapability(evalReq.request.language),
                language = evalReq.request.language
            response.report = {}
            response.report.capability = capability
            response.report.programmingLanguage = language
            response.report.exercise = programmingExercise.id
            let tests = []
            try {
                programmingExercise.keywords = sanitizeKeywords(programmingExercise.keywords)
                if(!fulfilPreConditions(program, programmingExercise.keywords)) throw (
                    new Error("Your solution doesn't meet the requirements.")
                )
                // place here the code your evaluator needs to get resultStudent
                for (let metadata of programmingExercise.tests) {
                    let lastTestError = {}
                    let input = programmingExercise.tests_contents_in[metadata.id]
                    let expectedOutput = programmingExercise.tests_contents_out[metadata.id]
                    let resultStudent = await getOutputFromAnswer(program, input, capability)
                        .catch(error => {
                            lastTestError = error
                        })
                    if(getGrade(expectedOutput, resultStudent) == 0) {
                        summary = {
                            "classify" : 'Wrong Answer',
                            "feedback" : 'Try it again'
                        }
                    }
                    tests.push(addTest(input, expectedOutput, resultStudent, lastTestError, metadata))
                }

            } catch (error) {
                summary = {
                    "classify" : "Compile Time Error",
                    "feedback" : error.message
                }
            } finally {
                response.report.tests = tests
                evalRes.setReply(response)
                evalRes.summary = summary
                resolve(evalRes)
            }
        })
    })
}

const getCapability = (language) => {
    let languagesArray = []
    capabilities.forEach(element => {
        languagesArray.push(element.features[element.features.findIndex(subelement => subelement.name == 'language')].value)
    })

    let indexCapability = languagesArray.findIndex(languageElement => languageElement.toLowerCase() == language.toLowerCase())
    return capabilities[indexCapability]
}

const sanitizeKeywords = (keywords) => {
    let sanitizedKeywords = [];
    keywords.forEach(keyword => {
        if (keyword.includes(',')) {
            keyword.split(',').map(k => k.trim()).forEach(k => sanitizedKeywords.push(k));
        } else {
            sanitizedKeywords.push(keyword.trim());
        }
    });
    return sanitizedKeywords;
}

const fulfilPreConditions = (program, keywords) => {
    let fulfilled = true
    let programLowerCase = program.toLowerCase()

    let mandatoryKeyword = keywords.find(keyword => keyword.toLowerCase().startsWith('mandatory'));
    if (mandatoryKeyword) {
        let mandatoryKeywords = mandatoryKeyword.toLowerCase().match(/\[(.*?)\]/)[1].split(';')
        mandatoryKeywords = mandatoryKeywords.map(keyword => keyword.match(/"(.*?)"/)[1]);
        mandatoryKeywords.forEach(keyword => {
            if(!programLowerCase.includes(keyword)) {
                fulfilled = false
            }
        })
    }
    let forbiddenKeyword = keywords.find(keyword => keyword.toLowerCase().startsWith('forbidden'));
    if (forbiddenKeyword) {
        let forbiddenKeywords = forbiddenKeyword.toLowerCase().match(/\[(.*?)\]/)[1].split(';')
        forbiddenKeywords = forbiddenKeywords.map(keyword => keyword.match(/"(.*?)"/)[1]);
        forbiddenKeywords.forEach(keyword => {
            if(programLowerCase.includes(keyword)) {
                fulfilled = false
            }
        })
    }
    return fulfilled
}

const getOutputFromAnswer = (program, input, capability) => {
    return new Promise((resolve, reject) => {
        var output = ''

        // Handling return data
        if(false) {
            reject(new Error())
        }if (true) {
            resolve(output)
        }
    })
}

const addTest = (input, expectedOutput, obtainedOutput, lastTestError, metadata) => {
    const Diff = require('diff')
    obtainedOutput = obtainedOutput ? obtainedOutput : ''
    const outputDifferences = JSON.stringify(Diff.diffTrimmedLines(expectedOutput, obtainedOutput));
    return {
        'input': input,
        'expectedOutput': visibilizeWhiteChars(expectedOutput),
        'obtainedOutput': visibilizeWhiteChars(obtainedOutput),
        'outputDifferences': outputDifferences ? outputDifferences : '',
        'classify': getClassify(expectedOutput, obtainedOutput, lastTestError),
        'mark': getGrade(expectedOutput, obtainedOutput),
        'visible': metadata.visible,
        'hint': metadata.feedback,
        'feedback': getFeedback(expectedOutput, obtainedOutput, lastTestError),
        'environmentValues': []
    }
}

const getGrade = (expectedOutput, obtainedOutput) => {
    return expectedOutput == obtainedOutput ? 100 : 0
}

const getFeedback = (expectedOutput, obtainedOutput, lastTestError) => {
    let feedback = 'Right Answer.'
    // Feedack will be fill by feedback-manager
    if(lastTestError) {
        feedback = lastTestError.toString()
    } else if(getGrade(expectedOutput, obtainedOutput) < 1) {
        feedback = 'Wrong Answer.'
    }
    return feedback
}

const getClassify = (expectedOutput, obtainedOutput, lastTestError) => {
    let classify = 'Accepted'

    if(getGrade(expectedOutput, obtainedOutput) < 1)
        classify = 'Wrong Answer'
    if(lastTestError?.code) {
        switch(lastTestError.code) {
            case 143:
                classify = 'Time Limit Exceeded'
                break
            default:
                classify = 'Runtime Error'
        }
    }
    return classify
}

const visibilizeWhiteChars = (originalString) => {
    const whiteChars = [
        {'in': '\n', 'out': '\u204B\n'},
        {'in': '\t', 'out': '\u2192\t'},
        {'in': ' ', 'out': '\u2591'},
    ]
    let replacedString = originalString;
    whiteChars.forEach(replaceObj => {
        let inRegExp = new RegExp(replaceObj.in, 'g')
        replacedString = replacedString.replace(inRegExp, replaceObj.out)
    })
    return replacedString;
}

module.exports = {
    evalProgramming,
    capabilities
}
