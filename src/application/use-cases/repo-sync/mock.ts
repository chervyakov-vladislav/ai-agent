export let mock = `package com.example.test;

import java.util.*;
import java.util.logging.Logger;

/**
 * Огромный сервис для тестирования скелетонизатора.
 * Этот файл должен превысить 3000-4000 символов.
 */
public class LargeTestService {
    private static final Logger logger = Logger.getLogger(LargeTestService.class.getName());
    private final Map<String, String> cache = new HashMap<>();

`;

mock += `    public void complexBusinessLogic(String input) {
        logger.info("Starting heavy processing...");
        // Имитируем огромный блок логики
`;
for (let i = 0; i < 50; i++) {
  mock += `        if (input.contains("${i}")) { 
            cache.put("key_${i}", "value_" + System.currentTimeMillis());
            System.out.println("Processing step ${i} for input: " + input);
        }\n`;
}
mock += `        logger.info("Processing finished");
    }\n\n`;

for (let i = 1; i <= 100; i++) {
  mock += `    /**
     * Helper method number ${i}
     */
    public String getHelperData${i}(String param) {
        return "data_" + param + "_${i}";
    }\n\n`;
}

mock += `}`;

// fs.writeFileSync(fileName, mock);
// console.log(`Файл ${fileName} создан. Размер: ${mock.length} символов.`);
