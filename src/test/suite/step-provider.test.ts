import * as assert from 'assert';
import { StepProvider } from '../../step-provider';

suite('StepProvider Unit Tests', () => {
    let stepProvider: StepProvider;

    suiteSetup(() => {
        stepProvider = new StepProvider();
    });

    suite('Pattern to Regex Conversion', () => {
        test('converts {string} placeholder to regex', () => {
            const regex = stepProvider.patternToRegex('I have a pet named {string}');
            assert.ok(regex.test('I have a pet named "Fluffy"'));
            assert.ok(!regex.test('I have a pet named Fluffy')); // Without quotes
        });

        test('converts {int} placeholder to regex', () => {
            const regex = stepProvider.patternToRegex('I should have {int} pets');
            assert.ok(regex.test('I should have 5 pets'));
            assert.ok(regex.test('I should have 0 pets'));
            assert.ok(!regex.test('I should have five pets')); // Word not number
        });

        test('converts {word} placeholder to regex', () => {
            const regex = stepProvider.patternToRegex('status is {word}');
            assert.ok(regex.test('status is available'));
            assert.ok(regex.test('status is pending'));
            assert.ok(!regex.test('status is available now')); // Multiple words
        });

        test('converts {float} placeholder to regex', () => {
            const regex = stepProvider.patternToRegex('price is {float}');
            assert.ok(regex.test('price is 19.99'));
            assert.ok(regex.test('price is 100'));
            assert.ok(regex.test('price is 0.5'));
        });

        test('converts {any} placeholder to regex', () => {
            const regex = stepProvider.patternToRegex('I see {any}');
            assert.ok(regex.test('I see anything goes here'));
            assert.ok(regex.test('I see a complex "quoted" value!'));
        });

        test('handles multiple placeholders', () => {
            const regex = stepProvider.patternToRegex('I have {int} {word} named {string}');
            assert.ok(regex.test('I have 3 pets named "Max"'));
            assert.ok(!regex.test('I have three pets named Max'));
        });

        test('escapes regex special characters', () => {
            const regex = stepProvider.patternToRegex('the price is ${amount}');
            // The $ should be escaped in the pattern
            assert.ok(regex.test('the price is ${amount}'));
        });

        test('case insensitive matching', () => {
            const regex = stepProvider.patternToRegex('I Have A Pet');
            assert.ok(regex.test('i have a pet'));
            assert.ok(regex.test('I HAVE A PET'));
        });
    });

    suite('Step Matching', () => {
        // Note: These tests would need actual step definitions to be meaningful
        // For now, we test that the methods exist and return expected types
        
        test('findMatchingStep returns undefined when no steps loaded', () => {
            const result = stepProvider.findMatchingStep('some step text');
            assert.strictEqual(result, undefined);
        });

        test('findMatchingAssertion returns undefined when no assertions loaded', () => {
            const result = stepProvider.findMatchingAssertion('some assertion text');
            assert.strictEqual(result, undefined);
        });

        test('getAllSteps returns empty array initially', () => {
            const steps = stepProvider.getAllSteps();
            assert.ok(Array.isArray(steps));
        });

        test('getAllAssertions returns empty array initially', () => {
            const assertions = stepProvider.getAllAssertions();
            assert.ok(Array.isArray(assertions));
        });

        test('getStepPatterns returns array', () => {
            const patterns = stepProvider.getStepPatterns();
            assert.ok(Array.isArray(patterns));
        });

        test('getAssertionPatterns returns array', () => {
            const patterns = stepProvider.getAssertionPatterns();
            assert.ok(Array.isArray(patterns));
        });
    });

    suite('Pattern Edge Cases', () => {
        test('handles empty pattern', () => {
            const regex = stepProvider.patternToRegex('');
            assert.ok(regex instanceof RegExp);
        });

        test('handles pattern with only placeholder', () => {
            const regex = stepProvider.patternToRegex('{string}');
            assert.ok(regex.test('"hello"'));
        });

        test('handles consecutive placeholders', () => {
            const regex = stepProvider.patternToRegex('{int}{int}');
            assert.ok(regex.test('12'));
            assert.ok(regex.test('99'));
        });

        test('handles pattern with special regex chars', () => {
            const regex = stepProvider.patternToRegex('check (this) [value]');
            assert.ok(regex.test('check (this) [value]'));
        });

        test('handles pattern with dots', () => {
            const regex = stepProvider.patternToRegex('version 1.0.0');
            assert.ok(regex.test('version 1.0.0'));
            // Dot is escaped, so it doesn't match any char
            assert.ok(!regex.test('version 1a0b0'));
        });
    });
});

suite('Step Annotation Parsing Tests', () => {
    test('Java @Step annotation pattern', () => {
        const javaStepPatterns = [
            '@Step(pattern = "I have a pet named {string}")',
            '@Step(pattern="test pattern")',
            '@Step( pattern = "spaced" )',
        ];
        
        for (const code of javaStepPatterns) {
            const match = code.match(/@Step\s*\(\s*pattern\s*=\s*"([^"]+)"/);
            assert.ok(match, `Should match pattern in: ${code}`);
        }
    });

    test('Kotlin @Step annotation pattern', () => {
        const kotlinStepPatterns = [
            '@Step("I have a pet")',
            '@Step( "test" )',
        ];
        
        for (const code of kotlinStepPatterns) {
            const match = code.match(/@Step\s*\(\s*"([^"]+)"/);
            assert.ok(match, `Should match pattern in: ${code}`);
        }
    });

    test('Method definition extraction - Kotlin', () => {
        const kotlinCode = `
    @Step("pattern")
    fun myMethod(name: String, count: Int) {
        `;
        const match = kotlinCode.match(/fun\s+(\w+)\s*\(([^)]*)\)/);
        assert.ok(match);
        assert.strictEqual(match[1], 'myMethod');
        assert.ok(match[2].includes('name: String'));
    });

    test('Method definition extraction - Java', () => {
        const javaCode = `
    @Step(pattern = "pattern")
    public void myMethod(String name, int count) {
        `;
        const match = javaCode.match(/(?:public|private|protected)?\s*(?:static)?\s*\w+\s+(\w+)\s*\(([^)]*)\)/);
        assert.ok(match);
        assert.strictEqual(match[1], 'myMethod');
    });
});
