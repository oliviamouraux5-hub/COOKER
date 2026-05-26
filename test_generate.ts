import { generateRecipes } from './src/lib/actions/recipes'

async function run() {
  const result = await generateRecipes({
    ingredients: "Tomato, Milk, Chicken",
    isCreative: true,
    creativeType: 'strict'
  })
  console.log(result)
}
run()
