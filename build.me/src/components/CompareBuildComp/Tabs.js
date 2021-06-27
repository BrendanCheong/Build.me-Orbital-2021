import { useState, useContext, useEffect, useCallback, createContext } from 'react';
import { CompBuildPageData } from '../../pages/Compare_Builds';
import Filler from './Build Tabs/Filler';
import CPUcontent from './Build Tabs/CPUcontent';
import GPUcontent from './Build Tabs/GPUcontent';
import MemoryContent from './Build Tabs/MemoryContent';
import PSUcontent from './Build Tabs/PSUcontent';
import StorageContent from './Build Tabs/StorageContent';
import MotherboardContent from './Build Tabs/MotherboardContent';
import axiosInstance from '../../AxiosInstance';
import { ErrorHandlingNotif } from '../Misc/Error';
import BudgetDonut from '../Charts/BudgetDonut';
import BudgetBar from './BudgetBar';

export const TabsData = createContext(null)

const Tabs = ({ id }) => {


    const [toggleTabs, setToggleTabs] = useState(1);
    const [submitting, setSubmitting] = useState(true); // this is for loading screen for async
    const [currentCardName, setCurrentCardName] = useState(null)
    const [currentPartsData, setCurrentPartsData] = useState(null)
    const [totalWattage, setTotalWattage] = useState(null);
    const [DonutAppear, setDonutAppear] = useState(false)
    const [tabsLoading, setTabsLoading] = useState(true)
    const [dataSetArray, setDataSetArray] = useState([])
    const [labelArray, setLabelArray] = useState([])
    const [ColorArray, setColorArray] = useState([])
    const [values, setValues] = useState({
        textmask: '(1  )    -    ',
        numberformat: '',
        });

    const { autoCompleteState0 , autoCompleteState1, setLoadingData} = useContext(CompBuildPageData)

    function CalculateRemainingAmt(arr) {
        const total = arr.reduce((a, b) => a + b)
        return (100 - total)
    }

    function LabelListCalc(arr) {
        let NewLabelArr = []
        let NewColorArr = []
        const labelArr = ['CPU','Motherboard','GPU','Memory','PSU','Storage','Remaining Budget']
        const ColorArr = ['#159dfb', '#c83955', '#FFD166', '#17d993', '#9CFFFA', '#2BD9FE', '#623CEA', '#DFB2F4', '#D36135', '#EF476F ']
        for (let i = 0; i < arr.length; ++i) {
            if( arr[i] ) {
                NewLabelArr.push(labelArr[i])
                NewColorArr.push(ColorArr[i])
            }
        }
        setLabelArray(NewLabelArr)
        setColorArray(NewColorArr)
    }

    const PercentageCalculator = useCallback((data) => {
        const CurrentBudget = parseFloat(values.numberformat)
        const itemArray = data.map((item) => item.itemPrice ? item.itemPrice.replace('S$',"") : 0)
        
        const itemPriceArray = itemArray.map((item) => typeof item === 'string' ? parseFloat(item.replace(',', '')) : 0)
        
        const SumPriceArray = itemPriceArray.reduce((a,b) => a + b)
        if (SumPriceArray > CurrentBudget) {
            console.log('Budget is too low!') 
            return 'Budget is too low!'
            // error handling
            // add some error handling here
        }
        let PercentageArray = itemPriceArray.map((item) => item ? parseFloat(((item / CurrentBudget) * 100).toFixed(2)) : 0 )
        const RemainingAmt = CalculateRemainingAmt(PercentageArray)
        PercentageArray.push(RemainingAmt)
        const FilterPercentageArr = PercentageArray.filter((item) => item > 0)
        setDataSetArray(FilterPercentageArr)
        LabelListCalc(PercentageArray)

    },[values.numberformat])

    const Toggler = (index) => {
        setToggleTabs(index);
    };

    const SubmitBudget = (event) => {
        event.preventDefault();
        if (values.numberformat.length > 0) {
            setDonutAppear(true)
            PercentageCalculator(currentPartsData)
        } else {
            setDonutAppear(false)
        }
        
    }

    const CheckOutParts = () => {
        if (currentPartsData) {
            currentPartsData.forEach((item) => {
                if (item.itemID) {
                    window.open(item.itemURL)
                }
            })
        }
    }

    const TotalWattageCalculator = useCallback(async () => {
        let Total = []
        try {
            const CPUID = currentPartsData[0].itemID;
            const GPUID = currentPartsData[2].itemID
            const MoboID = currentPartsData[1].itemID;
            const MemoryID = currentPartsData[3].itemID;
            const StorageID = currentPartsData[5].itemID;
            if (CPUID) {
                const CPUresponse = await axiosInstance.get(`/CPUs/${CPUID}`);
                const data = CPUresponse.data;
                Total.push(parseInt(data.itemTDP.replace(' W','')))
            }
            if (GPUID) {
                const GPUresponse = await axiosInstance.get(`/GPUs/${GPUID}`);
                const data = GPUresponse.data;
                Total.push(parseInt(data.itemTDP.replace(' W','')))
            }
            if (MoboID) {
                Total.push(70)
            }
            if (MemoryID) {
                const MemoryResponse = await axiosInstance.get(`/RAMs/${MemoryID}`);
                const data = MemoryResponse.data;
                const actualSpeed = parseInt(data.memSpeed.replace('DDR4-',''));
                if (actualSpeed < 3000) {
                    const amt = Math.round((data.totalMem) * (0.71875));
                    Total.push(amt)
                } else if (actualSpeed < 2000) {
                    const amt = Math.round((data.totalMem) * (1.125)); 
                    Total.push(amt)
                } else {
                    const amt = Math.round((data.totalMem) * (0.90625))
                    Total.push(amt)
                }
            }
            if (StorageID) {
                const StorageResponse = await axiosInstance.get(`/Storage/${StorageID}`);
                const data =StorageResponse.data;
                if (!data.itemType === 'SSD') {
                    Total.push(10)
                } else {
                    Total.push(20)
                }
            }
            const TotalWattage = Total.reduce((a,b) => a + b, 0)
            return TotalWattage
            
        } catch(err) {
            if (!err.message === "Cannot read property '0' of null") {
                ErrorHandlingNotif()
            }
        }
        
    },[currentPartsData])

    useEffect(() => { // decide which tab gets which appropiate state
        switch(id) {
            case 0:
                setCurrentCardName(autoCompleteState0)
                setSubmitting(true)
                setLoadingData(true)
                break;
            default:
                setCurrentCardName(autoCompleteState1)
                setSubmitting(true)
                setLoadingData(true)
                break;
        }
    },[autoCompleteState0, autoCompleteState1, id, setLoadingData])

    useEffect(() => { // when currentCardName for tab is selected, auto search for that unique name Card's partsData
        const getPartsData = async () => {
            try {
                const response = await axiosInstance.get('/Builder/find')

                const selectedCard = response.data.CardArray.filter((card) => card.CardName === currentCardName)
                if (selectedCard.length > 0) {
                    setCurrentPartsData(selectedCard[0].partsData)
                    const totalWattage = await TotalWattageCalculator()
                    setTotalWattage(totalWattage)
                    setSubmitting(false) // *** might cause bugs ***
                    setTabsLoading(true) // ** might cause bugs **
                    PercentageCalculator(currentPartsData)
                    
                }
                
            } catch(err) {
                
                if (!err.message === "Cannot read property 'map' of null" || !err.message === "Cannot read property '0' of null") {
                    ErrorHandlingNotif()
                }
                
            }
        }

        if(submitting) {
            getPartsData()
        }
    },[currentCardName, submitting,PercentageCalculator,currentPartsData, TotalWattageCalculator])


    return (
        <div className="w-1/2 h-full border rounded-md shadow-md">
            <div id="tabs buttons" className="inline-flex w-full px-1 pt-2 bg-indigo-500 border-b rounded-t-md">
                <button 
                className={ toggleTabs === 1 ?
                    "px-4 py-2 -mb-px font-semibold text-gray-800 bg-trueGray-100 border-t border-l border-r rounded-t"
                    :
                    "px-4 py-2 font-semibold text-white rounded-t"
                    }
                onClick={() => Toggler(1)}>
                    CPU
                </button>
                <button 
                className={ toggleTabs === 2 ?
                    "px-4 py-2 -mb-px font-semibold text-gray-800 bg-trueGray-100 border-t border-l border-r rounded-t"
                    :
                    "px-4 py-2 font-semibold text-white rounded-t"
                    }
                onClick={() => Toggler(2)}>
                    Motherboard
                </button>
                <button 
                className={ toggleTabs === 3 ?
                    "px-4 py-2 -mb-px font-semibold text-gray-800 bg-trueGray-100 border-t border-l border-r rounded-t"
                    :
                    "px-4 py-2 font-semibold text-white rounded-t"
                    }
                onClick={() => Toggler(3)}>
                    GPU
                </button>
                <button 
                className={ toggleTabs === 4 ?
                    "px-4 py-2 -mb-px font-semibold text-gray-800 bg-trueGray-100 border-t border-l border-r rounded-t"
                    :
                    "px-4 py-2 font-semibold text-white rounded-t"
                    }
                onClick={() => Toggler(4)}>
                    Memory
                </button>
                <button 
                className={ toggleTabs === 5 ?
                    "px-4 py-2 -mb-px font-semibold text-gray-800 bg-trueGray-100 border-t border-l border-r rounded-t"
                    :
                    "px-4 py-2 font-semibold text-white rounded-t"
                    }
                onClick={() => Toggler(5)}>
                    PSU
                </button>
                <button 
                className={ toggleTabs === 6 ?
                    "px-4 py-2 -mb-px font-semibold text-gray-800 bg-trueGray-100 border-t border-l border-r rounded-t"
                    :
                    "px-4 py-2 font-semibold text-white rounded-t"
                    }
                onClick={() => Toggler(6)}>
                    Storage
                </button>
                <button 
                className={ toggleTabs === 7 ?
                    "px-4 py-2 -mb-px font-semibold text-gray-800 bg-trueGray-100 border-t border-l border-r rounded-t"
                    :
                    "px-4 py-2 font-semibold text-white rounded-t"
                    }
                onClick={() => Toggler(7)}>
                    Budget
                </button>
            </div>

            {/** Tab Content */}
            
            <div id="tab-contents">
            <TabsData.Provider value={{currentPartsData, tabsLoading, setTabsLoading, totalWattage}}>
                <div id={`first ${id}`} 
                className={ toggleTabs === 1 ? "w-full h-custom p-4 flex text-center justify-center"
                    :
                    "hidden p-4"
                    }
                >
                { currentPartsData ?
                    <CPUcontent CheckOutParts={CheckOutParts}/> // swap this later
                :
                    <Filler/>
                    
                }
                </div>
                <div id={`second ${id}`} className={ toggleTabs === 2 ? "block p-4"
                    :
                    "hidden p-4"
                    }
                >
                { currentPartsData ?
                    <MotherboardContent CheckOutParts={CheckOutParts}/> // swap this later
                :
                    <Filler/>
                    
                }
                </div>
                <div id={`third ${id}`} className={ toggleTabs === 3 ? "block p-4"
                    :
                    "hidden p-4"
                    }
                >
                { currentPartsData ?
                    <GPUcontent CheckOutParts={CheckOutParts}/> // swap this later
                :
                    <Filler/>
                    
                }
                </div>
                <div id={`fourth ${id}`} className={ toggleTabs === 4 ? "block p-4"
                    :
                    "hidden p-4"
                    }
                >
                { currentPartsData ?
                    <MemoryContent CheckOutParts={CheckOutParts}/> // swap this later
                :
                    <Filler/>
                    
                }
                </div>
                <div id={`fifth ${id}`} className={ toggleTabs === 5 ? "block p-4"
                    :
                    "hidden p-4"
                    }
                >
                { currentPartsData ?
                    <PSUcontent CheckOutParts={CheckOutParts}/> // swap this later
                :
                    <Filler/>
                    
                }
                </div>
                <div id={`sixth ${id}`} className={ toggleTabs === 6 ? "block p-4"
                    :
                    "hidden p-4"
                    }
                >
                { currentPartsData ?
                    <StorageContent CheckOutParts={CheckOutParts}/> // swap this later
                :
                    <Filler/>
                    
                }
                </div>
                <form id={`Budget ${id}`} className={ toggleTabs === 7 ? "flex flex-col items-center p-4 w-full h-full"
                    :
                    "hidden p-4"
                    }
                onSubmit={SubmitBudget}
                >
                {currentPartsData && <BudgetBar id={id} values={values} setValues={setValues}/>}
                {DonutAppear && <BudgetDonut dataSetArray={dataSetArray} labelArray={labelArray} ColorArray={ColorArray}/>}
                </form>
            </TabsData.Provider>
            </div>
            
        </div>
    )
}

export default Tabs
